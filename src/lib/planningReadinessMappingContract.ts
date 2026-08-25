import { PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION } from "./planningClarificationAnswerSchema";
import { PLANNING_CLARIFICATION_ANSWER_SCHEMA_RESOLVER_VERSION } from "./planningClarificationAnswerSchemaResolver";
import { getActivePlanningRulesForProjectType } from "./planningRules";
import type { PhaseGateId } from "./phaseGates";

export const PLANNING_READINESS_MAPPING_CONTRACT_VERSION = "phase-5c.3c.3j.4";
export const PLANNING_READINESS_MAPPING_REGISTRY_ID = "project-builder-planning-readiness-mappings";
export const PLANNING_READINESS_MAPPING_REGISTRY_VERSION = PLANNING_READINESS_MAPPING_CONTRACT_VERSION;
export const PLANNING_READINESS_MAPPING_VERSION = "1.0.0";

export const PLANNING_READINESS_MAPPING_CANONICAL_PATHS = Object.freeze([
  "powerPlatform.canvas.componentApplicabilityDecision",
  "powerPlatform.canvas.componentTargets",
  "powerPlatform.canvas.componentYamlRequired",
  "powerPlatform.canvas.connectorFieldSchemas",
  "powerPlatform.canvas.connectorResourceSchemas",
  "powerPlatform.canvas.containerYamlRequired",
  "powerPlatform.canvas.controlLevelYamlRequired",
  "powerPlatform.canvas.controlTargets",
  "powerPlatform.canvas.dataverseColumnSchemas",
  "powerPlatform.canvas.dataverseTableSchemas",
  "powerPlatform.canvas.delegationRequirements",
  "powerPlatform.canvas.delegationStatus",
  "powerPlatform.canvas.existingSourceAvailability",
  "powerPlatform.canvas.expectedInstallationMethod",
  "powerPlatform.canvas.expectedRecordCounts",
  "powerPlatform.canvas.filteringRequirements",
  "powerPlatform.canvas.fullScreenYamlRequired",
  "powerPlatform.canvas.paYamlSourceRequired",
  "powerPlatform.canvas.primaryConnectorId",
  "powerPlatform.canvas.primaryDataSourceType",
  "powerPlatform.canvas.screenTargets",
  "powerPlatform.canvas.searchRequirements",
  "powerPlatform.canvas.secondaryConnectorIds",
  "powerPlatform.canvas.selectedDataSourceTypes",
  "powerPlatform.canvas.sharePointAccessStatus",
  "powerPlatform.canvas.sharePointColumnSchemas",
  "powerPlatform.canvas.sharePointLibrarySchemas",
  "powerPlatform.canvas.sharePointListSchemas",
  "powerPlatform.canvas.sharePointSiteOwner",
  "powerPlatform.canvas.sharePointSites",
  "powerPlatform.canvas.sharePointSiteTitle",
  "powerPlatform.canvas.sharePointSiteUrl",
  "powerPlatform.canvas.sortingRequirements",
  "powerPlatform.canvas.validationResponsibility",
  "powerPlatform.canvas.yamlStatus",
  "powerPlatform.common.accessibilityTesting",
  "powerPlatform.common.almConfirmationStatus",
  "powerPlatform.common.auditRequirements",
  "powerPlatform.common.authenticationRequirements",
  "powerPlatform.common.authorizationRequirements",
  "powerPlatform.common.connectionReferences",
  "powerPlatform.common.connectors",
  "powerPlatform.common.connectorTesting",
  "powerPlatform.common.deploymentMethod",
  "powerPlatform.common.deploymentResponsibility",
  "powerPlatform.common.deploymentStrategy",
  "powerPlatform.common.deploymentTesting",
  "powerPlatform.common.environmentVariables",
  "powerPlatform.common.functionalTesting",
  "powerPlatform.common.gitIntegration",
  "powerPlatform.common.integrationTesting",
  "powerPlatform.common.performanceTesting",
  "powerPlatform.common.permissionTesting",
  "powerPlatform.common.pipelineRequirements",
  "powerPlatform.common.powerPlatformCliAvailability",
  "powerPlatform.common.privacyRequirements",
  "powerPlatform.common.productionSmokeTesting",
  "powerPlatform.common.recordAccessRules",
  "powerPlatform.common.regressionTesting",
  "powerPlatform.common.releaseApprovalResponsibility",
  "powerPlatform.common.releaseApprovalStatus",
  "powerPlatform.common.releaseApprover",
  "powerPlatform.common.rollbackExpectations",
  "powerPlatform.common.securityReviewStatus",
  "powerPlatform.common.securityTesting",
  "powerPlatform.common.sourceControlApproach",
  "powerPlatform.common.testingPlanConfirmationStatus",
  "powerPlatform.common.userAcceptanceTesting",
  "powerPlatform.common.volumeTesting"
] as const);

export type PlanningReadinessMappingCanonicalPath =
  (typeof PLANNING_READINESS_MAPPING_CANONICAL_PATHS)[number];

export const PLANNING_READINESS_MAPPING_CLASSIFICATIONS = [
  "exactFromAnswer",
  "exactByCanonicalMerge",
  "partialProjection",
  "unsupportedProjection"
] as const;

export type PlanningReadinessMappingClassification =
  (typeof PLANNING_READINESS_MAPPING_CLASSIFICATIONS)[number];

export const PLANNING_READINESS_MAPPING_MISSING_FACT_CODES = [
  "siteIdentityMissing",
  "siteOwnerMissing",
  "siteAccessStatusMissing",
  "listIdentityMissing",
  "columnSchemaMissing",
  "columnIdentityMissing",
  "columnTypeMissing",
  "controlledStatusMissing",
  "parentBindingMissing",
  "dataSourceReferencesMissing",
  "connectorEvidenceMissing",
  "entityReferencesMissing",
  "formulaDependenciesMissing",
  "yamlRequirementFlagsMissing",
  "yamlSourceMissing",
  "delegationSupportMissing",
  "securityModelMismatch",
  "testingCategoryMissing",
  "almStrategyMismatch",
  "releaseAuthorizationMissing",
  "releaseEvidenceDestinationMissing",
  "internalNameConfirmationMissing",
  "architectApprovalMissing"
] as const;

export type PlanningReadinessMappingMissingFactCode =
  (typeof PLANNING_READINESS_MAPPING_MISSING_FACT_CODES)[number];

export const PLANNING_READINESS_MAPPING_STALE_INVALIDATION_REASONS = [
  "stale",
  "superseded",
  "ruleVersionChanged",
  "answerSchemaChanged",
  "mappingVersionChanged",
  "backendContextChanged",
  "fingerprintChanged",
  "confirmedSourceHistorical",
  "replacementUnanswered"
] as const;

export type PlanningReadinessMappingStaleInvalidationReason =
  (typeof PLANNING_READINESS_MAPPING_STALE_INVALIDATION_REASONS)[number];

export interface PlanningReadinessMappingBackendContext {
  projectType: "powerAppsCanvas";
  backendKind: "sharePointList";
  schemaResolverVersion: typeof PLANNING_CLARIFICATION_ANSWER_SCHEMA_RESOLVER_VERSION;
}

interface PlanningReadinessMappingDefinitionBase {
  mappingId: string;
  mappingVersion: typeof PLANNING_READINESS_MAPPING_VERSION;
  ruleId: string;
  ruleVersion: "1.0.0";
  gateId: PhaseGateId;
  classification: PlanningReadinessMappingClassification;
  answerSchemaContractVersion: typeof PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION;
  canonicalDestinationPaths: readonly PlanningReadinessMappingCanonicalPath[];
  canonicalMergePaths: readonly PlanningReadinessMappingCanonicalPath[];
  canonicalValidatorDependencyPaths: readonly PlanningReadinessMappingCanonicalPath[];
  validatorId: string;
  missingFactCodes: readonly PlanningReadinessMappingMissingFactCode[];
  architectApprovalRequired: true;
  projectionAuthorized: false;
  readinessAuthorized: false;
  applyAuthorized: false;
  projectorId: null;
  notApplicableProjectionAuthorized: false;
}

export type PlanningReadinessMappingDefinition =
  | (PlanningReadinessMappingDefinitionBase & {
      answerSchemaSource: "staticRule";
      backendContext?: never;
    })
  | (PlanningReadinessMappingDefinitionBase & {
      answerSchemaSource: "backendSpecific";
      backendContext: PlanningReadinessMappingBackendContext;
    });

export interface PlanningReadinessMappingPolicies {
  existingValueConflictPolicy: {
    same: "unchanged";
    empty: "projectionCandidate";
    partial: "blocked";
    different: "blocked";
    invalid: "blocked";
  };
  canonicalMergePolicy: "explicitAllowlistOnly";
  notApplicableProjectionAuthorized: false;
  staleInvalidationReasons: readonly PlanningReadinessMappingStaleInvalidationReason[];
  legacy: "failClosed";
  duplicate: "noAuthorityTransfer";
  archiveRestore: "fullRevalidationRequired";
  privacy: "metadataOnly";
}

export interface PlanningReadinessMappingRegistry {
  registryId: typeof PLANNING_READINESS_MAPPING_REGISTRY_ID;
  registryVersion: typeof PLANNING_READINESS_MAPPING_REGISTRY_VERSION;
  contractVersion: typeof PLANNING_READINESS_MAPPING_CONTRACT_VERSION;
  policies: PlanningReadinessMappingPolicies;
  definitions: readonly PlanningReadinessMappingDefinition[];
}

export type PlanningReadinessMappingValidationIssueCode =
  | "invalidInput"
  | "invalidRegistry"
  | "invalidPolicy"
  | "invalidDefinition"
  | "invalidMappingId"
  | "invalidMappingVersion"
  | "duplicateMappingId"
  | "duplicateRuleContext"
  | "unknownRule"
  | "ruleVersionMismatch"
  | "gateMismatch"
  | "classificationMismatch"
  | "invalidAnswerSchema"
  | "invalidBackendContext"
  | "invalidCanonicalPath"
  | "duplicatePath"
  | "pathCategoryCollision"
  | "invalidValidator"
  | "invalidMissingFactCode"
  | "invalidApprovalPolicy"
  | "authorityViolation"
  | "incompleteRuleCoverage";

export interface PlanningReadinessMappingValidationIssue {
  code: PlanningReadinessMappingValidationIssueCode;
  message: string;
  definitionIndex?: number;
  field?: string;
}

export type PlanningReadinessMappingDefinitionValidationResult =
  | { outcome: "valid"; definition: PlanningReadinessMappingDefinition; issues: readonly [] }
  | { outcome: "invalid"; issues: readonly PlanningReadinessMappingValidationIssue[] };

export type PlanningReadinessMappingRegistryValidationResult =
  | { outcome: "valid"; registry: PlanningReadinessMappingRegistry; issues: readonly [] }
  | { outcome: "invalid"; issues: readonly PlanningReadinessMappingValidationIssue[] };

const DEFINITION_KEYS = [
  "mappingId",
  "mappingVersion",
  "ruleId",
  "ruleVersion",
  "gateId",
  "classification",
  "answerSchemaContractVersion",
  "answerSchemaSource",
  "backendContext",
  "canonicalDestinationPaths",
  "canonicalMergePaths",
  "canonicalValidatorDependencyPaths",
  "validatorId",
  "missingFactCodes",
  "architectApprovalRequired",
  "projectionAuthorized",
  "readinessAuthorized",
  "applyAuthorized",
  "projectorId",
  "notApplicableProjectionAuthorized"
] as const;

const EXPECTED_CLASSIFICATIONS: Readonly<Record<string, PlanningReadinessMappingClassification>> = {
  "pp.canvas.schema.confirmation": "partialProjection",
  "pp.sharepoint.internalnames.confirmation": "partialProjection",
  "pp.canvas.screentargets.confirmation": "partialProjection",
  "pp.canvas.controltargets.confirmation": "partialProjection",
  "pp.canvas.components.confirmation": "partialProjection",
  "pp.canvas.yamlplanning.confirmation": "partialProjection",
  "pp.canvas.delegation.confirmation": "partialProjection",
  "pp.security.permissions.confirmation": "unsupportedProjection",
  "pp.testing.outcomes.confirmation": "unsupportedProjection",
  "pp.alm.rollback.confirmation": "unsupportedProjection",
  "pp.release.approval.confirmation": "partialProjection"
};

const EXPECTED_VALIDATORS: Readonly<Record<PhaseGateId, string | undefined>> = {
  schema: "calculateCanvasSchemaGate",
  internalNames: "calculateInternalNameGate",
  screenTargets: "validateCanvasTargets",
  controlTargets: "validateCanvasTargets",
  componentTargets: "validateCanvasTargets",
  yaml: "calculateCanvasYamlPlanningGate",
  delegation: "calculateCanvasDelegationPlanningGate",
  security: "calculateSecurityReviewGate",
  testing: "calculateTestingPreparationGate",
  alm: "calculateAlmGate",
  releaseApproval: "releaseApproval phase-gate evaluator"
} as Readonly<Record<PhaseGateId, string | undefined>>;

const CANONICAL_PATH_PATTERN = /^powerPlatform\.(?:canvas|common)\.[A-Za-z][A-Za-z0-9]*$/;
const MAPPING_ID_PATTERN = /^planning-map\.[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const BACKEND_RULE_ID = "pp.canvas.schema.confirmation";
const ARRAY_LIMIT = 100;

export function validatePlanningReadinessMappingDefinition(
  input: unknown
): PlanningReadinessMappingDefinitionValidationResult {
  if (!isPlainObject(input) || !hasOnlyKeys(input, DEFINITION_KEYS)) {
    return invalid([issue("invalidInput", "Mapping definition must be a canonical metadata object.")]);
  }

  const issues: PlanningReadinessMappingValidationIssue[] = [];
  const mappingId = validBoundedString(input.mappingId, 200, MAPPING_ID_PATTERN);
  const ruleId = validBoundedString(input.ruleId, 128);
  const ruleVersion = input.ruleVersion;
  const gateId = input.gateId;

  if (!mappingId) issues.push(issue("invalidMappingId", "Mapping ID is invalid.", "mappingId"));
  if (input.mappingVersion !== PLANNING_READINESS_MAPPING_VERSION) {
    issues.push(issue("invalidMappingVersion", "Mapping version is invalid.", "mappingVersion"));
  }

  const activeRule = ruleId
    ? getActivePlanningRulesForProjectType("powerAppsCanvas").find((candidate) => candidate.ruleId === ruleId)
    : undefined;
  if (!activeRule) {
    issues.push(issue("unknownRule", "Mapping rule is not an active Canvas clarification rule.", "ruleId"));
  } else {
    if (ruleVersion !== activeRule.ruleVersion) {
      issues.push(issue("ruleVersionMismatch", "Mapping rule version does not match the active rule.", "ruleVersion"));
    }
    if (gateId !== activeRule.target.targetKey) {
      issues.push(issue("gateMismatch", "Mapping gate does not match the active rule target.", "gateId"));
    }
  }

  const classification = enumValue(input.classification, PLANNING_READINESS_MAPPING_CLASSIFICATIONS);
  if (!classification || (ruleId && EXPECTED_CLASSIFICATIONS[ruleId] !== classification)) {
    issues.push(issue("classificationMismatch", "Mapping classification is invalid for the active rule.", "classification"));
  }

  if (input.answerSchemaContractVersion !== PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION) {
    issues.push(issue("invalidAnswerSchema", "Answer-schema contract version is invalid.", "answerSchemaContractVersion"));
  }
  const answerSchemaSource = input.answerSchemaSource;
  const backendContext = validateAnswerSchemaBinding(ruleId, answerSchemaSource, input.backendContext, issues);

  const destinations = validatePathCollection(input.canonicalDestinationPaths, "canonicalDestinationPaths", false, issues);
  const merges = validatePathCollection(input.canonicalMergePaths, "canonicalMergePaths", true, issues);
  const dependencies = validatePathCollection(
    input.canonicalValidatorDependencyPaths,
    "canonicalValidatorDependencyPaths",
    true,
    issues
  );
  if (destinations && merges && dependencies) {
    const destinationSet = new Set(destinations);
    const mergeSet = new Set(merges);
    if (merges.some((path) => destinationSet.has(path)) || dependencies.some((path) => destinationSet.has(path) || mergeSet.has(path))) {
      issues.push(issue("pathCategoryCollision", "Canonical path categories must not overlap.", "canonicalDestinationPaths"));
    }
  }

  const expectedValidator = typeof gateId === "string"
    ? EXPECTED_VALIDATORS[gateId as PhaseGateId]
    : undefined;
  if (typeof input.validatorId !== "string" || input.validatorId !== expectedValidator) {
    issues.push(issue("invalidValidator", "Canonical validator identity is invalid.", "validatorId"));
  }

  const missingFactCodes = validateMissingFactCodes(input.missingFactCodes, issues);
  if (input.architectApprovalRequired !== true) {
    issues.push(issue("invalidApprovalPolicy", "Architect approval must remain required.", "architectApprovalRequired"));
  }
  if (
    input.projectionAuthorized !== false ||
    input.readinessAuthorized !== false ||
    input.applyAuthorized !== false ||
    input.notApplicableProjectionAuthorized !== false
  ) {
    issues.push(issue("authorityViolation", "Mapping authority flags must remain false.", "projectionAuthorized"));
  }
  if (input.projectorId !== null) {
    issues.push(issue("authorityViolation", "Mapping projector identity must remain null.", "projectorId"));
  }

  if (
    issues.length > 0 ||
    !mappingId ||
    !ruleId ||
    !activeRule ||
    !classification ||
    !destinations ||
    !merges ||
    !dependencies ||
    !missingFactCodes ||
    !expectedValidator ||
    (answerSchemaSource !== "staticRule" && answerSchemaSource !== "backendSpecific")
  ) {
    return invalid(issues);
  }

  const base = {
    mappingId,
    mappingVersion: PLANNING_READINESS_MAPPING_VERSION,
    ruleId,
    ruleVersion: "1.0.0" as const,
    gateId: activeRule.target.targetKey,
    classification,
    answerSchemaContractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION,
    canonicalDestinationPaths: destinations,
    canonicalMergePaths: merges,
    canonicalValidatorDependencyPaths: dependencies,
    validatorId: expectedValidator,
    missingFactCodes,
    architectApprovalRequired: true as const,
    projectionAuthorized: false as const,
    readinessAuthorized: false as const,
    applyAuthorized: false as const,
    projectorId: null,
    notApplicableProjectionAuthorized: false as const
  } as const;

  const definition: PlanningReadinessMappingDefinition = answerSchemaSource === "backendSpecific"
    ? { ...base, answerSchemaSource, backendContext: backendContext! }
    : { ...base, answerSchemaSource };
  return { outcome: "valid", definition: deepFreeze(definition), issues: [] };
}

export function validatePlanningReadinessMappingRegistry(
  input: unknown
): PlanningReadinessMappingRegistryValidationResult {
  if (!isPlainObject(input) || !hasOnlyKeys(input, ["registryId", "registryVersion", "contractVersion", "policies", "definitions"])) {
    return invalidRegistry([issue("invalidRegistry", "Mapping registry must be a canonical metadata object.")]);
  }
  const issues: PlanningReadinessMappingValidationIssue[] = [];
  if (
    input.registryId !== PLANNING_READINESS_MAPPING_REGISTRY_ID ||
    input.registryVersion !== PLANNING_READINESS_MAPPING_REGISTRY_VERSION ||
    input.contractVersion !== PLANNING_READINESS_MAPPING_CONTRACT_VERSION
  ) {
    issues.push(issue("invalidRegistry", "Mapping registry identity or version is invalid."));
  }
  const policies = validatePolicies(input.policies, issues);
  if (!Array.isArray(input.definitions) || input.definitions.length !== 11 || hasSparseArrayEntry(input.definitions)) {
    issues.push(issue("invalidRegistry", "Mapping registry must contain exactly eleven definitions.", "definitions"));
    return invalidRegistry(issues);
  }

  const definitions: PlanningReadinessMappingDefinition[] = [];
  input.definitions.forEach((candidate, definitionIndex) => {
    const result = validatePlanningReadinessMappingDefinition(candidate);
    if (result.outcome === "invalid") {
      issues.push(...result.issues.map((entry) => ({ ...entry, definitionIndex })));
    } else {
      definitions.push(result.definition);
    }
  });

  const mappingIds = new Set<string>();
  const ruleContexts = new Set<string>();
  for (const definition of definitions) {
    if (mappingIds.has(definition.mappingId)) {
      issues.push(issue("duplicateMappingId", "Mapping IDs must be unique."));
    }
    mappingIds.add(definition.mappingId);
    const context = definition.answerSchemaSource === "backendSpecific"
      ? `${definition.ruleId}\u0000${definition.backendContext.projectType}\u0000${definition.backendContext.backendKind}`
      : definition.ruleId;
    if (ruleContexts.has(context)) {
      issues.push(issue("duplicateRuleContext", "Applicable rule and context identities must be unique."));
    }
    ruleContexts.add(context);
  }

  const activeRuleIds = getActivePlanningRulesForProjectType("powerAppsCanvas").map((rule) => rule.ruleId).sort();
  const definitionRuleIds = definitions.map((definition) => definition.ruleId).sort();
  if (!sameStrings(activeRuleIds, definitionRuleIds)) {
    issues.push(issue("incompleteRuleCoverage", "Registry must cover every active Canvas clarification rule exactly once."));
  }
  if (issues.length > 0 || !policies) return invalidRegistry(issues);

  return {
    outcome: "valid",
    registry: deepFreeze({
      registryId: PLANNING_READINESS_MAPPING_REGISTRY_ID,
      registryVersion: PLANNING_READINESS_MAPPING_REGISTRY_VERSION,
      contractVersion: PLANNING_READINESS_MAPPING_CONTRACT_VERSION,
      policies,
      definitions
    }),
    issues: []
  };
}

function validateAnswerSchemaBinding(
  ruleId: string | null,
  source: unknown,
  context: unknown,
  issues: PlanningReadinessMappingValidationIssue[]
): PlanningReadinessMappingBackendContext | undefined {
  if (ruleId === BACKEND_RULE_ID) {
    if (source !== "backendSpecific") {
      issues.push(issue("invalidAnswerSchema", "Backend rule requires the backend-specific answer schema.", "answerSchemaSource"));
    }
    if (
      !isPlainObject(context) ||
      !hasOnlyKeys(context, ["projectType", "backendKind", "schemaResolverVersion"]) ||
      context.projectType !== "powerAppsCanvas" ||
      context.backendKind !== "sharePointList" ||
      context.schemaResolverVersion !== PLANNING_CLARIFICATION_ANSWER_SCHEMA_RESOLVER_VERSION
    ) {
      issues.push(issue("invalidBackendContext", "Backend mapping context is invalid.", "backendContext"));
      return undefined;
    }
    return {
      projectType: "powerAppsCanvas",
      backendKind: "sharePointList",
      schemaResolverVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_RESOLVER_VERSION
    };
  }
  if (source !== "staticRule" || context !== undefined) {
    issues.push(issue("invalidBackendContext", "Static rules cannot define backend context.", "backendContext"));
  }
  return undefined;
}

function validatePathCollection(
  input: unknown,
  field: string,
  allowEmpty: boolean,
  issues: PlanningReadinessMappingValidationIssue[]
): PlanningReadinessMappingCanonicalPath[] | null {
  if (!Array.isArray(input) || input.length > ARRAY_LIMIT || (!allowEmpty && input.length === 0) || hasSparseArrayEntry(input)) {
    issues.push(issue("invalidCanonicalPath", "Canonical path collection is invalid.", field));
    return null;
  }
  const paths: PlanningReadinessMappingCanonicalPath[] = [];
  const seen = new Set<string>();
  for (const value of input) {
    if (
      typeof value !== "string" ||
      !CANONICAL_PATH_PATTERN.test(value) ||
      !PLANNING_READINESS_MAPPING_CANONICAL_PATHS.includes(value as PlanningReadinessMappingCanonicalPath)
    ) {
      issues.push(issue("invalidCanonicalPath", "Canonical path must be an exact approved ProjectRecord property path.", field));
      continue;
    }
    if (seen.has(value)) {
      issues.push(issue("duplicatePath", "Canonical path collection contains a duplicate.", field));
      continue;
    }
    seen.add(value);
    paths.push(value as PlanningReadinessMappingCanonicalPath);
  }
  return paths;
}

function validateMissingFactCodes(
  input: unknown,
  issues: PlanningReadinessMappingValidationIssue[]
): PlanningReadinessMappingMissingFactCode[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > ARRAY_LIMIT || hasSparseArrayEntry(input)) {
    issues.push(issue("invalidMissingFactCode", "Missing-fact code collection is invalid.", "missingFactCodes"));
    return null;
  }
  const allowed = new Set<string>(PLANNING_READINESS_MAPPING_MISSING_FACT_CODES);
  const values: PlanningReadinessMappingMissingFactCode[] = [];
  const seen = new Set<string>();
  for (const value of input) {
    if (typeof value !== "string" || !allowed.has(value) || seen.has(value)) {
      issues.push(issue("invalidMissingFactCode", "Missing-fact code is invalid.", "missingFactCodes"));
      continue;
    }
    seen.add(value);
    values.push(value as PlanningReadinessMappingMissingFactCode);
  }
  return values;
}

function validatePolicies(
  input: unknown,
  issues: PlanningReadinessMappingValidationIssue[]
): PlanningReadinessMappingPolicies | null {
  if (!isPlainObject(input) || !hasOnlyKeys(input, [
    "existingValueConflictPolicy",
    "canonicalMergePolicy",
    "notApplicableProjectionAuthorized",
    "staleInvalidationReasons",
    "legacy",
    "duplicate",
    "archiveRestore",
    "privacy"
  ])) {
    issues.push(issue("invalidPolicy", "Mapping registry policy metadata is invalid.", "policies"));
    return null;
  }
  const conflict = input.existingValueConflictPolicy;
  const staleReasons = input.staleInvalidationReasons;
  const valid = isPlainObject(conflict) &&
    hasOnlyKeys(conflict, ["same", "empty", "partial", "different", "invalid"]) &&
    conflict.same === "unchanged" &&
    conflict.empty === "projectionCandidate" &&
    conflict.partial === "blocked" &&
    conflict.different === "blocked" &&
    conflict.invalid === "blocked" &&
    input.canonicalMergePolicy === "explicitAllowlistOnly" &&
    input.notApplicableProjectionAuthorized === false &&
    Array.isArray(staleReasons) &&
    sameStrings(staleReasons, PLANNING_READINESS_MAPPING_STALE_INVALIDATION_REASONS) &&
    input.legacy === "failClosed" &&
    input.duplicate === "noAuthorityTransfer" &&
    input.archiveRestore === "fullRevalidationRequired" &&
    input.privacy === "metadataOnly";
  if (!valid) {
    issues.push(issue("invalidPolicy", "Mapping registry policy metadata is invalid.", "policies"));
    return null;
  }
  return {
    existingValueConflictPolicy: {
      same: "unchanged",
      empty: "projectionCandidate",
      partial: "blocked",
      different: "blocked",
      invalid: "blocked"
    },
    canonicalMergePolicy: "explicitAllowlistOnly",
    notApplicableProjectionAuthorized: false,
    staleInvalidationReasons: [...PLANNING_READINESS_MAPPING_STALE_INVALIDATION_REASONS],
    legacy: "failClosed",
    duplicate: "noAuthorityTransfer",
    archiveRestore: "fullRevalidationRequired",
    privacy: "metadataOnly"
  };
}

function invalid(
  issues: readonly PlanningReadinessMappingValidationIssue[]
): PlanningReadinessMappingDefinitionValidationResult {
  return { outcome: "invalid", issues: issues.slice(0, 100) };
}

function invalidRegistry(
  issues: readonly PlanningReadinessMappingValidationIssue[]
): PlanningReadinessMappingRegistryValidationResult {
  return { outcome: "invalid", issues: issues.slice(0, 100) };
}

function issue(
  code: PlanningReadinessMappingValidationIssueCode,
  message: string,
  field?: string
): PlanningReadinessMappingValidationIssue {
  return { code, message, ...(field === undefined ? {} : { field }) };
}

function enumValue<T extends string>(input: unknown, values: readonly T[]): T | null {
  return typeof input === "string" && values.includes(input as T) ? input as T : null;
}

function validBoundedString(input: unknown, limit: number, pattern?: RegExp): string | null {
  if (
    typeof input !== "string" ||
    input.length === 0 ||
    input.length > limit ||
    [...input].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  ) return null;
  return !pattern || pattern.test(input) ? input : null;
}

function sameStrings(first: readonly unknown[], second: readonly unknown[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function hasOnlyKeys(input: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(input).every((key) => allowed.includes(key));
}

function hasSparseArrayEntry(input: readonly unknown[]): boolean {
  for (let index = 0; index < input.length; index += 1) {
    if (!(index in input)) return true;
  }
  return false;
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
}

function deepFreeze<T>(input: T): T {
  if (typeof input !== "object" || input === null || Object.isFrozen(input)) return input;
  Object.freeze(input);
  Object.values(input).forEach((value) => deepFreeze(value));
  return input;
}
