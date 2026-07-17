import type {
  CanvasDataSourceType,
  CanvasComponentTarget,
  CanvasComponentUsageTarget,
  CanvasControlTarget,
  CanvasScreenTarget,
  CanvasTargetDataSourceReference,
  PowerPlatformApplicabilityDecision,
  PowerPlatformGateStatus,
  ProjectRecord,
  SelectableCanvasDataSourceType
} from "../types/project";

export interface CanvasTargetValidationResult {
  screenStatus: PowerPlatformGateStatus;
  controlStatus: PowerPlatformGateStatus;
  componentStatus: PowerPlatformGateStatus;
  formulaStatus: PowerPlatformGateStatus;
  yamlStatus: PowerPlatformGateStatus;
  implementationStatus: PowerPlatformGateStatus;
  blockers: string[];
  formulaTargets: CanvasControlTarget[];
  yamlScreenTargets: CanvasScreenTarget[];
  yamlControlTargets: CanvasControlTarget[];
  yamlComponentTargets: CanvasComponentTarget[];
}

export interface ActiveCanvasEntityReference {
  entityId: string;
  entityType: "sharePointList" | "sharePointLibrary" | "dataverseTable" | "connectorResource";
  connectorId: string;
  backendType: CanvasDataSourceType;
}

export interface ReconciledCanvasConnectorSelection {
  primaryConnectorId: string;
  activeConnectorIds: string[];
  activeSecondaryConnectorIds: string[];
  inactiveStoredConnectorIds: string[];
  blockers: string[];
}

function hasMeaningfulText(value: string | undefined | null): boolean {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  return !/^(not applicable|none|n\/a|no formula|no yaml required|not decided|unknown|pending|tbd|to be determined|n\/a pending|none yet|needs review|unconfirmed|missing|no decision yet|no confirmation|no approved approach)$/i.test(value.trim());
}

function decisionStatus(decision: PowerPlatformApplicabilityDecision | undefined, label: string, blockers: string[]): PowerPlatformGateStatus {
  if (!decision || decision.status === "undecided") {
    blockers.push(`${label} applicability is undecided.`);
    return "missingInformation";
  }
  if (decision.status === "notApplicable") {
    if (!hasMeaningfulText(decision.notApplicableReason)) {
      blockers.push(`${label} not-applicable reason is missing or placeholder text.`);
      return "missingInformation";
    }
    if (decision.confirmationStatus !== "confirmed") {
      blockers.push(`${label} not-applicable decision is not confirmed.`);
      return "reviewNeeded";
    }
    return "notApplicable";
  }
  if (!hasMeaningfulText(decision.details)) {
    blockers.push(`${label} required details are missing.`);
    return "missingInformation";
  }
  if (decision.confirmationStatus !== "confirmed") {
    blockers.push(`${label} required decision is not confirmed.`);
    return "reviewNeeded";
  }
  return "confirmed";
}

function aggregateStatus(statuses: PowerPlatformGateStatus[]): PowerPlatformGateStatus {
  if (statuses.includes("blocked") || statuses.includes("failed")) return "blocked";
  if (statuses.includes("missingInformation") || statuses.includes("notStarted")) return "missingInformation";
  if (statuses.includes("reviewNeeded") || statuses.includes("manualValidationRequired") || statuses.includes("inProgress")) return "reviewNeeded";
  if (statuses.some((status) => status === "confirmed" || status === "ready" || status === "passed")) return "confirmed";
  return "notApplicable";
}

function unique(values: string[]): boolean {
  return values.length === new Set(values).size;
}

function selectedBackendLabel(project: ProjectRecord): string {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return "[no Canvas data]";
  if (canvas.primaryDataSourceType === "multiple") return `multiple: ${canvas.selectedDataSourceTypes.join(", ") || "[none selected]"}`;
  return canvas.primaryDataSourceType || "[missing]";
}

export function reconcileCanvasConnectorSelection(project: ProjectRecord): ReconciledCanvasConnectorSelection {
  const canvas = project.powerPlatform?.canvas;
  const connectors = project.powerPlatform?.common.connectors ?? [];
  const blockers: string[] = [];
  if (!canvas) {
    return { primaryConnectorId: "", activeConnectorIds: [], activeSecondaryConnectorIds: [], inactiveStoredConnectorIds: [], blockers: [] };
  }

  const byId = new Map(connectors.filter((connector) => connector.id).map((connector) => [connector.id, connector]));
  const storedIds = [...new Set([
    canvas.primaryConnectorId,
    ...canvas.secondaryConnectorIds,
    ...connectors.filter((connector) => connector.canvasRole === "primary" || connector.canvasRole === "secondary").map((connector) => connector.id)
  ].filter(Boolean))];
  const activeConnectorIds: string[] = [];
  const inactiveStoredConnectorIds: string[] = [];
  let primaryConnectorId = "";
  const activeSecondaryConnectorIds: string[] = [];
  const rolePrimary = connectors.find((connector) =>
    connector.canvasRole === "primary"
    && isSelectableCanvasDataSourceType(connector.dataSourceType)
    && (
      canvas.primaryDataSourceType === "multiple"
        ? canvas.selectedDataSourceTypes.includes(connector.dataSourceType)
        : connector.dataSourceType === canvas.primaryDataSourceType
    )
  );
  const candidatePrimaryId = canvas.primaryConnectorId || rolePrimary?.id || "";

  if (canvas.primaryDataSourceType === "multiple") {
    const allowedTypes = new Set(canvas.selectedDataSourceTypes);
    if (allowedTypes.size < 2) blockers.push("Canvas multiple-source mode requires at least two selected backend types.");
    const primary = byId.get(candidatePrimaryId);
    if (!primary || !isSelectableCanvasDataSourceType(primary.dataSourceType) || !allowedTypes.has(primary.dataSourceType)) {
      blockers.push(`Primary connector ${candidatePrimaryId || "[missing]"} is not assigned to a currently selected Canvas backend (${selectedBackendLabel(project)}).`);
    } else {
      primaryConnectorId = primary.id;
      activeConnectorIds.push(primary.id);
    }

    for (const connectorId of canvas.secondaryConnectorIds) {
      const connector = byId.get(connectorId);
      if (!connector || !isSelectableCanvasDataSourceType(connector.dataSourceType) || !allowedTypes.has(connector.dataSourceType) || connector.id === primaryConnectorId) {
        inactiveStoredConnectorIds.push(connectorId);
        blockers.push(`Secondary connector ${connectorId} is inactive for current Canvas backend selection (${selectedBackendLabel(project)}).`);
        continue;
      }
      if (activeConnectorIds.includes(connector.id)) {
        inactiveStoredConnectorIds.push(connector.id);
        blockers.push(`Connector ${connector.id} is assigned more than once.`);
        continue;
      }
      activeConnectorIds.push(connector.id);
      activeSecondaryConnectorIds.push(connector.id);
    }

    for (const connector of connectors.filter((item) => item.canvasRole === "secondary" && !canvas.secondaryConnectorIds.includes(item.id))) {
      if (!isSelectableCanvasDataSourceType(connector.dataSourceType) || !allowedTypes.has(connector.dataSourceType) || activeConnectorIds.includes(connector.id)) {
        inactiveStoredConnectorIds.push(connector.id);
        continue;
      }
      activeConnectorIds.push(connector.id);
      activeSecondaryConnectorIds.push(connector.id);
    }

    for (const sourceType of allowedTypes) {
      if (!activeConnectorIds.some((id) => byId.get(id)?.dataSourceType === sourceType)) {
        blockers.push(`No active Canvas connector is assigned for selected backend ${sourceType}.`);
      }
    }
  } else if (isSelectableCanvasDataSourceType(canvas.primaryDataSourceType)) {
    const primary = byId.get(candidatePrimaryId);
    if (!primary || primary.dataSourceType !== canvas.primaryDataSourceType) {
      blockers.push(`Primary connector ${candidatePrimaryId || "[missing]"} must match single Canvas backend ${canvas.primaryDataSourceType}.`);
    } else {
      primaryConnectorId = primary.id;
      activeConnectorIds.push(primary.id);
    }
    for (const connectorId of canvas.secondaryConnectorIds) {
      inactiveStoredConnectorIds.push(connectorId);
    }
    for (const connector of connectors.filter((item) => item.canvasRole === "secondary")) {
      inactiveStoredConnectorIds.push(connector.id);
    }
  } else {
    blockers.push("Canvas primary data-source type is undecided.");
    storedIds.forEach((id) => inactiveStoredConnectorIds.push(id));
  }

  for (const id of storedIds) {
    if (!activeConnectorIds.includes(id) && !inactiveStoredConnectorIds.includes(id)) inactiveStoredConnectorIds.push(id);
  }

  return {
    primaryConnectorId,
    activeConnectorIds: [...new Set(activeConnectorIds)],
    activeSecondaryConnectorIds: [...new Set(activeSecondaryConnectorIds)],
    inactiveStoredConnectorIds: [...new Set(inactiveStoredConnectorIds)],
    blockers: [...new Set(blockers)]
  };
}

function selectedConnectorIds(project: ProjectRecord): Set<string> {
  return new Set(reconcileCanvasConnectorSelection(project).activeConnectorIds);
}

function isSelectableCanvasDataSourceType(value: unknown): value is SelectableCanvasDataSourceType {
  return [
    "sharePointList",
    "sharePointLibrary",
    "microsoftList",
    "dataverse",
    "excel",
    "sqlServer",
    "microsoft365Connector",
    "customConnector",
    "externalApi",
    "otherConnector"
  ].includes(value as SelectableCanvasDataSourceType);
}

function selectedCanvasDataSourceTypes(project: ProjectRecord): Set<SelectableCanvasDataSourceType> {
  const canvas = project.powerPlatform?.canvas;
  const selected = new Set<SelectableCanvasDataSourceType>();
  if (!canvas) return selected;

  if (canvas.primaryDataSourceType === "multiple") {
    canvas.selectedDataSourceTypes.forEach((sourceType) => selected.add(sourceType));
  } else if (isSelectableCanvasDataSourceType(canvas.primaryDataSourceType)) {
    selected.add(canvas.primaryDataSourceType);
  }

  return selected;
}

export function connectorSupportsCanvasEntity(connectorType: string, entityKind: ActiveCanvasEntityReference["entityType"]): boolean {
  if (entityKind === "sharePointList" || entityKind === "sharePointLibrary") {
    return connectorType === "sharePointList" || connectorType === "sharePointLibrary" || connectorType === "microsoftList";
  }
  if (entityKind === "dataverseTable") return connectorType === "dataverse";
  if (entityKind === "connectorResource") {
    return ["externalApi", "customConnector", "otherConnector", "microsoft365Connector", "sqlServer", "excel"].includes(connectorType);
  }
  return false;
}

function activeConnectorsByType(project: ProjectRecord, sourceTypes: Set<SelectableCanvasDataSourceType>) {
  const connectors = project.powerPlatform?.common.connectors ?? [];
  const selectedIds = selectedConnectorIds(project);
  return connectors.filter((connector) =>
    Boolean(connector.id)
    && selectedIds.has(connector.id)
    && isSelectableCanvasDataSourceType(connector.dataSourceType)
    && sourceTypes.has(connector.dataSourceType)
    && (connector.approvalConfirmationStatus === "confirmed" || connector.classificationConfirmationStatus === "confirmed")
  );
}

function firstActiveConnectorForEntity(project: ProjectRecord, sourceTypes: Set<SelectableCanvasDataSourceType>, entityType: ActiveCanvasEntityReference["entityType"]) {
  return activeConnectorsByType(project, sourceTypes).find((connector) => connectorSupportsCanvasEntity(connector.dataSourceType, entityType));
}

export function activeCanvasEntityReferences(project: ProjectRecord): Map<string, ActiveCanvasEntityReference> {
  const canvas = project.powerPlatform?.canvas;
  const entities = new Map<string, ActiveCanvasEntityReference>();
  if (!canvas) return entities;
  const selectedTypes = selectedCanvasDataSourceTypes(project);

  const hasSharePointBackend = selectedTypes.has("sharePointList") || selectedTypes.has("sharePointLibrary") || selectedTypes.has("microsoftList");
  if (hasSharePointBackend) {
    const connector = firstActiveConnectorForEntity(project, selectedTypes, "sharePointList");
    if (connector) {
      canvas.sharePointListSchemas
        .filter((entity) => entity.confirmationStatus === "confirmed")
        .forEach((entity) => entities.set(entity.id, {
          entityId: entity.id,
          entityType: "sharePointList",
          connectorId: connector.id,
          backendType: connector.dataSourceType as CanvasDataSourceType
        }));
    }
  }

  if (hasSharePointBackend) {
    const connector = firstActiveConnectorForEntity(project, selectedTypes, "sharePointLibrary");
    if (connector) {
      canvas.sharePointLibrarySchemas
        .filter((entity) => entity.confirmationStatus === "confirmed")
        .forEach((entity) => entities.set(entity.id, {
          entityId: entity.id,
          entityType: "sharePointLibrary",
          connectorId: connector.id,
          backendType: connector.dataSourceType as CanvasDataSourceType
        }));
    }
  }

  if (selectedTypes.has("dataverse")) {
    const connector = firstActiveConnectorForEntity(project, selectedTypes, "dataverseTable");
    if (connector) {
      canvas.dataverseTableSchemas
        .filter((entity) => entity.confirmationStatus === "confirmed")
        .forEach((entity) => entities.set(entity.id, {
          entityId: entity.id,
          entityType: "dataverseTable",
          connectorId: connector.id,
          backendType: connector.dataSourceType as CanvasDataSourceType
        }));
    }
  }

  canvas.connectorResourceSchemas
    .filter((entity) => entity.confirmationStatus === "confirmed")
    .forEach((entity) => {
      const connector = project.powerPlatform?.common.connectors.find((candidate) =>
        candidate.id === entity.connectorId
        && selectedConnectorIds(project).has(candidate.id)
        && isSelectableCanvasDataSourceType(candidate.dataSourceType)
        && selectedTypes.has(candidate.dataSourceType)
        && connectorSupportsCanvasEntity(candidate.dataSourceType, "connectorResource")
      );
      if (!connector) return;
      entities.set(entity.id, {
        entityId: entity.id,
        entityType: "connectorResource",
        connectorId: connector.id,
        backendType: connector.dataSourceType as CanvasDataSourceType
      });
    });
  return entities;
}

function fieldBelongsToEntity(project: ProjectRecord, entity: ActiveCanvasEntityReference, connectorId: string, fieldId: string): boolean {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return false;
  if (entity.entityType === "sharePointList" || entity.entityType === "sharePointLibrary") {
    return canvas.sharePointColumnSchemas.some((field) => field.id === fieldId && field.parentId === entity.entityId && field.confirmationStatus === "confirmed");
  }
  if (entity.entityType === "dataverseTable") {
    return canvas.dataverseColumnSchemas.some((field) => field.id === fieldId && field.tableId === entity.entityId && field.confirmationStatus === "confirmed");
  }
  return canvas.connectorFieldSchemas.some((field) =>
    field.id === fieldId
    && field.connectorId === connectorId
    && field.resourceId === entity.entityId
    && field.confirmationStatus === "confirmed"
  );
}

function controlParentHasCycle(controls: CanvasControlTarget[], controlId: string): boolean {
  const byId = new Map(controls.map((control) => [control.id, control]));
  const seen = new Set<string>();
  let current = byId.get(controlId);
  while (current?.parentControlId) {
    if (current.parentControlId === controlId || seen.has(current.parentControlId)) return true;
    seen.add(current.parentControlId);
    current = byId.get(current.parentControlId);
  }
  return false;
}

function validateConnectorEntityAndFields(project: ProjectRecord, target: CanvasControlTarget, blockers: string[]): PowerPlatformGateStatus {
  const connectors = project.powerPlatform?.common.connectors ?? [];
  const selectedIds = selectedConnectorIds(project);
  const connector = connectors.find((item) => item.id === target.connectorId);
  const entities = activeCanvasEntityReferences(project);
  const entity = entities.get(target.entityId);
  const statuses: PowerPlatformGateStatus[] = [];

  if (!hasMeaningfulText(target.connectorId) || !connector || !selectedIds.has(target.connectorId)) {
    blockers.push(`Control target ${target.id} has an unknown or unselected connector ID: ${target.connectorId || "[missing]"}.`);
    statuses.push("missingInformation");
  }
  if (!hasMeaningfulText(target.entityId) || !entity) {
    blockers.push(`Control target ${target.id} has an unknown, inactive, or unconfirmed entity ID: ${target.entityId || "[missing]"}.`);
    statuses.push("missingInformation");
  }
  if (connector && entity && !connectorSupportsCanvasEntity(connector.dataSourceType, entity.entityType)) {
    blockers.push(`Control target ${target.id} connector ${connector.id} does not match entity ${entity.entityId}.`);
    statuses.push("blocked");
  }
  if (entity?.connectorId && entity.connectorId !== target.connectorId) {
    blockers.push(`Control target ${target.id} entity ${entity.entityId} belongs to connector ${entity.connectorId}, not ${target.connectorId}.`);
    statuses.push("blocked");
  }
  if (!unique(target.requiredFieldIds)) {
    blockers.push(`Control target ${target.id} has duplicate required field IDs.`);
    statuses.push("blocked");
  }
  if (entity && target.requiredFieldIds.some((fieldId) => !fieldBelongsToEntity(project, entity, target.connectorId, fieldId))) {
    blockers.push(`Control target ${target.id} has required field IDs that do not belong to entity ${entity.entityId}.`);
    statuses.push("missingInformation");
  }

  return statuses.length === 0 ? "confirmed" : aggregateStatus(statuses);
}

function referenceKey(reference: CanvasTargetDataSourceReference): string {
  return `${reference.connectorId}::${reference.entityId}`;
}

function validateScreenDataSourceReference(
  project: ProjectRecord,
  screen: CanvasScreenTarget,
  reference: CanvasTargetDataSourceReference,
  activeEntities: Map<string, ActiveCanvasEntityReference>,
  blockers: string[]
): PowerPlatformGateStatus {
  const connectors = project.powerPlatform?.common.connectors ?? [];
  const selectedIds = selectedConnectorIds(project);
  const connector = connectors.find((item) => item.id === reference.connectorId);
  const entity = activeEntities.get(reference.entityId);
  const statuses: PowerPlatformGateStatus[] = [];

  if (!hasMeaningfulText(reference.connectorId) || !connector || !selectedIds.has(reference.connectorId)) {
    blockers.push(`Screen target ${screen.id} reference ${reference.connectorId || "[missing]"}/${reference.entityId || "[missing]"} is inactive for current Canvas backend (${selectedBackendLabel(project)}): missing, unknown, or unselected connector.`);
    statuses.push("missingInformation");
  }
  if (!hasMeaningfulText(reference.entityId) || !entity) {
    blockers.push(`Screen target ${screen.id} reference ${reference.connectorId || "[missing]"}/${reference.entityId || "[missing]"} is inactive for current Canvas backend (${selectedBackendLabel(project)}): entity is missing, deselected, inactive, or unconfirmed.`);
    statuses.push("missingInformation");
  }
  if (connector && entity && !connectorSupportsCanvasEntity(connector.dataSourceType, entity.entityType)) {
    blockers.push(`Screen target ${screen.id} reference ${reference.connectorId}/${reference.entityId} is invalid for current Canvas backend (${selectedBackendLabel(project)}): connector ${connector.id} does not support entity ${entity.entityId}.`);
    statuses.push("blocked");
  }
  if (entity && entity.connectorId !== reference.connectorId) {
    blockers.push(`Screen target ${screen.id} reference ${reference.connectorId}/${reference.entityId} is invalid for current Canvas backend (${selectedBackendLabel(project)}): entity ${entity.entityId} belongs to connector ${entity.connectorId}.`);
    statuses.push("blocked");
  }

  return statuses.length === 0 ? "confirmed" : aggregateStatus(statuses);
}

function validateComponentUsageTarget(
  component: CanvasComponentTarget,
  usage: CanvasComponentUsageTarget,
  confirmedScreenIds: Set<string>,
  confirmedControlIds: Set<string>,
  controls: CanvasControlTarget[],
  blockers: string[]
): PowerPlatformGateStatus {
  const statuses: PowerPlatformGateStatus[] = [];
  if (!hasMeaningfulText(usage.id) || !hasMeaningfulText(usage.targetId) || !hasMeaningfulText(usage.purpose)) {
    blockers.push(`Component target ${component.id} has an incomplete usage target ${usage.id || "[missing]"}.`);
    statuses.push("missingInformation");
  }
  if (usage.confirmationStatus !== "confirmed" || !hasMeaningfulText(usage.confirmationSource)) {
    blockers.push(`Component target ${component.id} usage target ${usage.id || "[missing]"} is not confirmed with a source.`);
    statuses.push("reviewNeeded");
  }
  if (usage.targetType === "screen") {
    if (!confirmedScreenIds.has(usage.targetId)) {
      blockers.push(`Component target ${component.id} references unknown or unconfirmed screen usage ID ${usage.targetId || "[missing]"}.`);
      statuses.push("missingInformation");
    }
  } else {
    const control = controls.find((item) => item.id === usage.targetId);
    if (!control || !confirmedControlIds.has(control.id)) {
      blockers.push(`Component target ${component.id} references unknown or unconfirmed control usage ID ${usage.targetId || "[missing]"}.`);
      statuses.push("missingInformation");
    } else if (!confirmedScreenIds.has(control.screenId)) {
      blockers.push(`Component target ${component.id} control usage ${control.id} belongs to a missing or unconfirmed screen.`);
      statuses.push("blocked");
    }
  }
  return statuses.length === 0 ? "confirmed" : aggregateStatus(statuses);
}

export function validateCanvasTargets(project: ProjectRecord): CanvasTargetValidationResult {
  const canvas = project.powerPlatform?.canvas;
  const blockers: string[] = [];
  if (!canvas) {
    return {
      screenStatus: "notApplicable",
      controlStatus: "notApplicable",
      componentStatus: "notApplicable",
      formulaStatus: "notApplicable",
      yamlStatus: "notApplicable",
      implementationStatus: "notApplicable",
      blockers,
      formulaTargets: [],
      yamlScreenTargets: [],
      yamlControlTargets: [],
      yamlComponentTargets: []
    };
  }

  const screenStatuses: PowerPlatformGateStatus[] = [];
  const controlStatuses: PowerPlatformGateStatus[] = [];
  const componentStatuses: PowerPlatformGateStatus[] = [];
  const formulaStatuses: PowerPlatformGateStatus[] = [];
  const yamlStatuses: PowerPlatformGateStatus[] = [];
  const formulaTargets: CanvasControlTarget[] = [];
  const yamlScreenTargets: CanvasScreenTarget[] = [];
  const yamlControlTargets: CanvasControlTarget[] = [];
  const yamlComponentTargets: CanvasComponentTarget[] = [];
  const screenIds = new Set(canvas.screenTargets.map((target) => target.id));
  const confirmedScreenIds = new Set(canvas.screenTargets.filter((target) => target.confirmationStatus === "confirmed").map((target) => target.id));
  const confirmedControlIds = new Set(canvas.controlTargets.filter((target) => target.confirmationStatus === "confirmed").map((target) => target.id));
  const entities = activeCanvasEntityReferences(project);
  const connectorSelection = reconcileCanvasConnectorSelection(project);
  if (connectorSelection.blockers.length > 0) {
    blockers.push(...connectorSelection.blockers);
    screenStatuses.push("missingInformation");
    controlStatuses.push("missingInformation");
  }

  if (canvas.screenTargets.length === 0) {
    blockers.push("No structured Canvas screen targets exist.");
    screenStatuses.push("missingInformation");
  }
  if (!unique(canvas.screenTargets.map((target) => target.id))) {
    blockers.push("Screen target IDs must be unique.");
    screenStatuses.push("blocked");
  }

  for (const screen of canvas.screenTargets) {
    if (!hasMeaningfulText(screen.id) || !hasMeaningfulText(screen.approvedScreenName) || !hasMeaningfulText(screen.purpose) || !hasMeaningfulText(screen.confirmationSource)) {
      blockers.push(`Screen target ${screen.id || "[missing]"} is missing stable ID, approved name, purpose, or confirmation source.`);
      screenStatuses.push("missingInformation");
    }
    if (screen.confirmationStatus !== "confirmed") screenStatuses.push("reviewNeeded");
    else screenStatuses.push("confirmed");

    const dataDecision = decisionStatus(screen.dataSourceApplicabilityDecision, `Screen target ${screen.id} data-source`, blockers);
    if (dataDecision === "confirmed") {
      if (screen.dataSourceReferences.length === 0) {
        blockers.push(`Screen target ${screen.id} needs structured connector/entity data-source references.`);
        screenStatuses.push("missingInformation");
      }
      if (!unique(screen.dataSourceReferences.map(referenceKey))) {
        blockers.push(`Screen target ${screen.id} has duplicate connector/entity data-source references.`);
        screenStatuses.push("blocked");
      }
      if (screen.dataSourceReferences.length === 0 && screen.dataSourceEntityIds.length > 0) {
        blockers.push(`Screen target ${screen.id} has legacy entity IDs but no structured connector/entity references.`);
        screenStatuses.push("missingInformation");
      }
      for (const reference of screen.dataSourceReferences) {
        screenStatuses.push(validateScreenDataSourceReference(project, screen, reference, entities, blockers));
      }
    } else if (dataDecision !== "notApplicable") {
      screenStatuses.push(dataDecision);
    }
  }

  if (canvas.controlTargets.length === 0) {
    blockers.push("No structured Canvas control targets exist.");
    controlStatuses.push("missingInformation");
  }
  if (!unique(canvas.controlTargets.map((target) => target.id))) {
    blockers.push("Control target IDs must be unique.");
    controlStatuses.push("blocked");
  }

  for (const control of canvas.controlTargets) {
    if (!hasMeaningfulText(control.id) || !hasMeaningfulText(control.approvedControlName) || !hasMeaningfulText(control.controlType) || !hasMeaningfulText(control.purpose) || !hasMeaningfulText(control.confirmationSource)) {
      blockers.push(`Control target ${control.id || "[missing]"} is missing stable ID, approved name, control type, purpose, or confirmation source.`);
      controlStatuses.push("missingInformation");
    }
    if (!hasMeaningfulText(control.screenId) || !confirmedScreenIds.has(control.screenId)) {
      blockers.push(`Control target ${control.id} references missing or unconfirmed screen ID ${control.screenId || "[missing]"}.`);
      controlStatuses.push("missingInformation");
    }
    if (control.parentControlId) {
      const parent = canvas.controlTargets.find((target) => target.id === control.parentControlId);
      if (!parent || !confirmedControlIds.has(parent.id)) {
        blockers.push(`Control target ${control.id} references invalid parent control ID ${control.parentControlId}.`);
        controlStatuses.push("missingInformation");
      } else if (parent.screenId !== control.screenId) {
        blockers.push(`Control target ${control.id} parent ${parent.id} belongs to another screen.`);
        controlStatuses.push("blocked");
      } else if (parent.id === control.id || controlParentHasCycle(canvas.controlTargets, control.id)) {
        blockers.push(`Control target ${control.id} has a cyclic parent-control relationship.`);
        controlStatuses.push("blocked");
      }
    }
    if (control.confirmationStatus !== "confirmed") controlStatuses.push("reviewNeeded");
    else controlStatuses.push("confirmed");

    const formulaDecision = decisionStatus(control.formulaOutputDecision, `Control target ${control.id} formula output`, blockers);
    if (formulaDecision === "confirmed") {
      if (!hasMeaningfulText(control.formulaProperties) || !hasMeaningfulText(control.operation)) {
        blockers.push(`Control target ${control.id} requires formula properties and operation.`);
        formulaStatuses.push("missingInformation");
      }
      const dependencyDecision = decisionStatus(control.dependencyApplicabilityDecision, `Control target ${control.id} dependencies`, blockers);
      if (dependencyDecision === "confirmed" && !hasMeaningfulText(control.dependencies)) {
        blockers.push(`Control target ${control.id} requires dependency notes or a confirmed None decision.`);
        formulaStatuses.push("missingInformation");
      } else if (dependencyDecision !== "confirmed" && dependencyDecision !== "notApplicable") {
        formulaStatuses.push(dependencyDecision);
      }
      const referenceStatus = validateConnectorEntityAndFields(project, control, blockers);
      formulaStatuses.push(referenceStatus);
      if (referenceStatus === "confirmed" && control.confirmationStatus === "confirmed" && hasMeaningfulText(control.formulaProperties) && hasMeaningfulText(control.operation)) {
        formulaTargets.push(control);
      }
    } else if (formulaDecision === "notApplicable") {
      // Valid non-formula control.
    } else {
      formulaStatuses.push(formulaDecision);
    }
  }

  const componentDecision = decisionStatus(canvas.componentApplicabilityDecision, "Canvas component", blockers);
  if (componentDecision === "confirmed") {
    if (canvas.componentTargets.length === 0) {
      blockers.push("Component applicability is required but no component targets exist.");
      componentStatuses.push("missingInformation");
    }
    if (!unique(canvas.componentTargets.map((target) => target.id))) {
      blockers.push("Component target IDs must be unique.");
      componentStatuses.push("blocked");
    }
    for (const component of canvas.componentTargets) {
      if (!hasMeaningfulText(component.id) || !hasMeaningfulText(component.approvedComponentName) || !hasMeaningfulText(component.purpose) || !hasMeaningfulText(component.confirmationSource)) {
        blockers.push(`Component target ${component.id || "[missing]"} is incomplete.`);
        componentStatuses.push("missingInformation");
      }
      if (component.usageTargets.length === 0) {
        blockers.push(`Component target ${component.id} requires at least one structured usage target; legacy usage text is not sufficient.`);
        componentStatuses.push("missingInformation");
      }
      if (!unique(component.usageTargets.map((usage) => `${usage.targetType}:${usage.targetId}`))) {
        blockers.push(`Component target ${component.id} has duplicate usage target references.`);
        componentStatuses.push("blocked");
      }
      for (const usage of component.usageTargets) {
        componentStatuses.push(validateComponentUsageTarget(component, usage, confirmedScreenIds, confirmedControlIds, canvas.controlTargets, blockers));
      }
      if (component.confirmationStatus !== "confirmed") componentStatuses.push("reviewNeeded");
      else componentStatuses.push("confirmed");
    }
  } else if (componentDecision !== "notApplicable") {
    componentStatuses.push(componentDecision);
  }

  const validateYaml = (target: CanvasScreenTarget | CanvasControlTarget | CanvasComponentTarget, targetType: "screen" | "control" | "component"): PowerPlatformGateStatus => {
    const decision = decisionStatus(target.yamlOutputDecision, `${targetType} target ${target.id} YAML output`, blockers);
    if (decision !== "confirmed") return decision;
    if (!hasMeaningfulText(target.yamlOutputType) || !hasMeaningfulText(target.yamlInstallationLocation) || !hasMeaningfulText(target.yamlValidationResponsibility)) {
      blockers.push(`${targetType} target ${target.id} requires YAML output type, installation location, and validation responsibility.`);
      return "missingInformation";
    }
    if (targetType === "screen") {
      if (target.yamlParentType !== "app" || (target.yamlParentId && target.yamlParentId !== "app-root")) {
        blockers.push(`Screen target ${target.id} has invalid YAML parent.`);
        return "blocked";
      }
      yamlScreenTargets.push(target as CanvasScreenTarget);
      return "confirmed";
    }
    if (targetType === "control") {
      const control = target as CanvasControlTarget;
      if (target.yamlParentType === "screen") {
        if (!screenIds.has(target.yamlParentId) || target.yamlParentId !== control.screenId) {
          blockers.push(`Control target ${target.id} has invalid screen YAML parent ${target.yamlParentId || "[missing]"}.`);
          return "blocked";
        }
      } else if (target.yamlParentType === "control") {
        const parent = canvas.controlTargets.find((item) => item.id === target.yamlParentId);
        if (!parent || parent.screenId !== control.screenId || parent.id === control.id || controlParentHasCycle(canvas.controlTargets, control.id)) {
          blockers.push(`Control target ${target.id} has invalid control YAML parent ${target.yamlParentId || "[missing]"}.`);
          return "blocked";
        }
      } else {
        blockers.push(`Control target ${target.id} YAML parent type must be screen or control.`);
        return "missingInformation";
      }
      yamlControlTargets.push(control);
      return "confirmed";
    }
    const component = target as CanvasComponentTarget;
    if (target.yamlParentType !== "component" && target.yamlParentType !== "none") {
      blockers.push(`Component target ${target.id} YAML parent type must be component or none.`);
      return "blocked";
    }
    if (target.yamlParentType === "component" && target.yamlParentId !== "component-root") {
      blockers.push(`Component target ${target.id} has invalid component YAML parent ${target.yamlParentId || "[missing]"}.`);
      return "blocked";
    }
    if (component.usageTargets.length === 0) {
      blockers.push(`Component target ${target.id} requires structured component usage targets for YAML output.`);
      return "missingInformation";
    }
    const usageStatuses = component.usageTargets.map((usage) => validateComponentUsageTarget(component, usage, confirmedScreenIds, confirmedControlIds, canvas.controlTargets, blockers));
    const usageStatus = aggregateStatus(usageStatuses);
    if (usageStatus !== "confirmed") return usageStatus;
    yamlComponentTargets.push(component);
    return "confirmed";
  };

  canvas.screenTargets.forEach((target) => yamlStatuses.push(validateYaml(target, "screen")));
  canvas.controlTargets.forEach((target) => yamlStatuses.push(validateYaml(target, "control")));
  canvas.componentTargets.forEach((target) => yamlStatuses.push(validateYaml(target, "component")));

  const screenStatus = aggregateStatus(screenStatuses);
  const controlStatus = aggregateStatus(controlStatuses);
  const componentStatus = aggregateStatus(componentStatuses);
  const formulaStatus = formulaStatuses.length === 0 ? "notApplicable" : aggregateStatus(formulaStatuses);
  const yamlStatus = yamlStatuses.length === 0 ? "notApplicable" : aggregateStatus(yamlStatuses);
  const implementationStatus = aggregateStatus([screenStatus, controlStatus, componentStatus, formulaStatus, yamlStatus]);

  return {
    screenStatus,
    controlStatus,
    componentStatus,
    formulaStatus,
    yamlStatus,
    implementationStatus,
    blockers: [...new Set(blockers)],
    formulaTargets,
    yamlScreenTargets,
    yamlControlTargets,
    yamlComponentTargets
  };
}
