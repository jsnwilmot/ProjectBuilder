import {
  PLANNING_READINESS_MAPPING_CONTRACT_VERSION,
  PLANNING_CANONICAL_FACT_EVIDENCE_BINDING_CONTRACT_VERSION,
  PLANNING_READINESS_MAPPING_REGISTRY_ID,
  PLANNING_READINESS_MAPPING_REGISTRY_VERSION,
  PLANNING_READINESS_MAPPING_STALE_INVALIDATION_REASONS,
  PLANNING_READINESS_MAPPING_VERSION,
  validatePlanningReadinessMappingRegistry,
  type PlanningReadinessMappingDefinition,
  type PlanningReadinessMappingRegistry
} from "./planningReadinessMappingContract";

const authority = {
  architectApprovalRequired: true,
  projectionAuthorized: false,
  readinessAuthorized: false,
  applyAuthorized: false,
  projectorId: null,
  notApplicableProjectionAuthorized: false
} as const;

const definition = (
  input: Omit<
    PlanningReadinessMappingDefinition,
    keyof typeof authority | "mappingVersion" | "ruleVersion" | "answerSchemaContractVersion" | "canonicalFactEvidenceBindings"
  > & Pick<Partial<PlanningReadinessMappingDefinition>, "canonicalFactEvidenceBindings">
): PlanningReadinessMappingDefinition => ({
  ...input,
  mappingVersion: PLANNING_READINESS_MAPPING_VERSION,
  ruleVersion: "1.0.0",
  answerSchemaContractVersion: "phase-5c.3c.3c",
  canonicalFactEvidenceBindings: input.canonicalFactEvidenceBindings ?? [],
  ...authority
} as PlanningReadinessMappingDefinition);

const PRODUCTION_REGISTRY_INPUT = {
  registryId: PLANNING_READINESS_MAPPING_REGISTRY_ID,
  registryVersion: PLANNING_READINESS_MAPPING_REGISTRY_VERSION,
  contractVersion: PLANNING_READINESS_MAPPING_CONTRACT_VERSION,
  policies: {
    existingValueConflictPolicy: {
      same: "unchanged",
      empty: "projectionCandidate",
      partial: "blocked",
      different: "blocked",
      invalid: "blocked"
    },
    canonicalMergePolicy: "explicitAllowlistOnly",
    notApplicableProjectionAuthorized: false,
    staleInvalidationReasons: PLANNING_READINESS_MAPPING_STALE_INVALIDATION_REASONS,
    legacy: "failClosed",
    duplicate: "noAuthorityTransfer",
    archiveRestore: "fullRevalidationRequired",
    privacy: "metadataOnly"
  },
  definitions: [
    definition({
      mappingId: "planning-map.pp.canvas.schema.confirmation.sharepoint-list",
      ruleId: "pp.canvas.schema.confirmation",
      gateId: "schema",
      classification: "partialProjection",
      answerSchemaSource: "backendSpecific",
      backendContext: {
        projectType: "powerAppsCanvas",
        backendKind: "sharePointList",
        schemaResolverVersion: "phase-5c.3c.3j.2a.1"
      },
      canonicalDestinationPaths: [
        "powerPlatform.canvas.sharePointSiteUrl",
        "powerPlatform.canvas.sharePointSiteTitle",
        "powerPlatform.canvas.sharePointSiteOwner",
        "powerPlatform.canvas.sharePointAccessStatus",
        "powerPlatform.canvas.sharePointListSchemas",
        "powerPlatform.canvas.sharePointColumnSchemas"
      ],
      canonicalMergePaths: [
        "powerPlatform.canvas.primaryDataSourceType",
        "powerPlatform.canvas.selectedDataSourceTypes"
      ],
      canonicalValidatorDependencyPaths: [
        "powerPlatform.canvas.sharePointSites",
        "powerPlatform.canvas.sharePointLibrarySchemas"
      ],
      validatorId: "calculateCanvasSchemaGate",
      missingFactCodes: [
        "siteIdentityMissing",
        "siteOwnerMissing",
        "siteAccessStatusMissing",
        "listIdentityMissing",
        "columnSchemaMissing",
        "columnIdentityMissing",
        "columnTypeMissing",
        "parentBindingMissing",
        "controlledStatusMissing",
        "internalNameConfirmationMissing"
      ]
    }),
    definition({
      mappingId: "planning-map.pp.sharepoint.internalnames.confirmation",
      ruleId: "pp.sharepoint.internalnames.confirmation",
      gateId: "internalNames",
      classification: "partialProjection",
      answerSchemaSource: "staticRule",
      canonicalDestinationPaths: ["powerPlatform.canvas.sharePointColumnSchemas"],
      canonicalMergePaths: [
        "powerPlatform.canvas.sharePointListSchemas",
        "powerPlatform.canvas.sharePointLibrarySchemas"
      ],
      canonicalValidatorDependencyPaths: [
        "powerPlatform.canvas.primaryDataSourceType",
        "powerPlatform.canvas.selectedDataSourceTypes"
      ],
      validatorId: "calculateInternalNameGate",
      missingFactCodes: [
        "columnIdentityMissing",
        "columnTypeMissing",
        "parentBindingMissing",
        "internalNameConfirmationMissing",
        "controlledStatusMissing"
      ]
    }),
    definition({
      mappingId: "planning-map.pp.canvas.screentargets.confirmation",
      ruleId: "pp.canvas.screentargets.confirmation",
      gateId: "screenTargets",
      classification: "partialProjection",
      answerSchemaSource: "staticRule",
      canonicalDestinationPaths: ["powerPlatform.canvas.screenTargets"],
      canonicalMergePaths: [
        "powerPlatform.common.connectors",
        "powerPlatform.canvas.sharePointListSchemas",
        "powerPlatform.canvas.sharePointLibrarySchemas",
        "powerPlatform.canvas.dataverseTableSchemas",
        "powerPlatform.canvas.connectorResourceSchemas"
      ],
      canonicalValidatorDependencyPaths: [
        "powerPlatform.canvas.primaryDataSourceType",
        "powerPlatform.canvas.selectedDataSourceTypes",
        "powerPlatform.canvas.primaryConnectorId",
        "powerPlatform.canvas.secondaryConnectorIds"
      ],
      validatorId: "validateCanvasTargets",
      missingFactCodes: [
        "dataSourceReferencesMissing",
        "connectorEvidenceMissing",
        "entityReferencesMissing",
        "controlledStatusMissing"
      ]
    }),
    definition({
      mappingId: "planning-map.pp.canvas.controltargets.confirmation",
      ruleId: "pp.canvas.controltargets.confirmation",
      gateId: "controlTargets",
      classification: "partialProjection",
      answerSchemaSource: "staticRule",
      canonicalDestinationPaths: ["powerPlatform.canvas.controlTargets"],
      canonicalMergePaths: [
        "powerPlatform.canvas.screenTargets",
        "powerPlatform.common.connectors",
        "powerPlatform.canvas.sharePointListSchemas",
        "powerPlatform.canvas.sharePointLibrarySchemas",
        "powerPlatform.canvas.dataverseTableSchemas",
        "powerPlatform.canvas.connectorResourceSchemas",
        "powerPlatform.canvas.sharePointColumnSchemas",
        "powerPlatform.canvas.dataverseColumnSchemas",
        "powerPlatform.canvas.connectorFieldSchemas"
      ],
      canonicalValidatorDependencyPaths: [
        "powerPlatform.canvas.primaryDataSourceType",
        "powerPlatform.canvas.selectedDataSourceTypes",
        "powerPlatform.canvas.primaryConnectorId",
        "powerPlatform.canvas.secondaryConnectorIds"
      ],
      validatorId: "validateCanvasTargets",
      missingFactCodes: [
        "dataSourceReferencesMissing",
        "connectorEvidenceMissing",
        "entityReferencesMissing",
        "formulaDependenciesMissing"
      ]
    }),
    definition({
      mappingId: "planning-map.pp.canvas.components.confirmation",
      ruleId: "pp.canvas.components.confirmation",
      gateId: "componentTargets",
      classification: "partialProjection",
      answerSchemaSource: "staticRule",
      canonicalDestinationPaths: [
        "powerPlatform.canvas.componentApplicabilityDecision",
        "powerPlatform.canvas.componentTargets"
      ],
      canonicalMergePaths: [
        "powerPlatform.canvas.screenTargets",
        "powerPlatform.canvas.controlTargets"
      ],
      canonicalValidatorDependencyPaths: [],
      validatorId: "validateCanvasTargets",
      missingFactCodes: ["entityReferencesMissing", "controlledStatusMissing"]
    }),
    definition({
      mappingId: "planning-map.pp.canvas.yamlplanning.confirmation",
      ruleId: "pp.canvas.yamlplanning.confirmation",
      gateId: "yaml",
      classification: "partialProjection",
      answerSchemaSource: "staticRule",
      canonicalDestinationPaths: [
        "powerPlatform.canvas.fullScreenYamlRequired",
        "powerPlatform.canvas.controlLevelYamlRequired",
        "powerPlatform.canvas.containerYamlRequired",
        "powerPlatform.canvas.componentYamlRequired",
        "powerPlatform.canvas.paYamlSourceRequired",
        "powerPlatform.canvas.expectedInstallationMethod",
        "powerPlatform.canvas.existingSourceAvailability",
        "powerPlatform.canvas.validationResponsibility",
        "powerPlatform.canvas.yamlStatus"
      ],
      canonicalMergePaths: [],
      canonicalValidatorDependencyPaths: [],
      canonicalFactEvidenceBindings: [{
        bindingContractVersion: PLANNING_CANONICAL_FACT_EVIDENCE_BINDING_CONTRACT_VERSION,
        mappingId: "planning-map.pp.canvas.yamlplanning.confirmation",
        mappingVersion: PLANNING_READINESS_MAPPING_VERSION,
        ruleId: "pp.canvas.yamlplanning.confirmation",
        ruleVersion: "1.0.0",
        answerFieldKey: "validationResponsibility",
        canonicalDestinationPath: "powerPlatform.canvas.validationResponsibility",
        destinationShape: "projectGlobalScalar",
        requiredSourceType: "userAnswer",
        requiredSourceAuthority: "confirmed",
        requiredSourceAvailability: "current",
        extractionKind: "directStructuredRecordField",
        scalarKind: "text"
      }],
      validatorId: "calculateCanvasYamlPlanningGate",
      missingFactCodes: ["yamlRequirementFlagsMissing", "yamlSourceMissing", "controlledStatusMissing"]
    }),
    definition({
      mappingId: "planning-map.pp.canvas.delegation.confirmation",
      ruleId: "pp.canvas.delegation.confirmation",
      gateId: "delegation",
      classification: "partialProjection",
      answerSchemaSource: "staticRule",
      canonicalDestinationPaths: [
        "powerPlatform.canvas.expectedRecordCounts",
        "powerPlatform.canvas.searchRequirements",
        "powerPlatform.canvas.filteringRequirements",
        "powerPlatform.canvas.sortingRequirements",
        "powerPlatform.canvas.delegationRequirements",
        "powerPlatform.canvas.delegationStatus"
      ],
      canonicalMergePaths: ["powerPlatform.common.connectors"],
      canonicalValidatorDependencyPaths: [
        "powerPlatform.canvas.sharePointListSchemas",
        "powerPlatform.canvas.dataverseTableSchemas"
      ],
      validatorId: "calculateCanvasDelegationPlanningGate",
      missingFactCodes: ["delegationSupportMissing", "connectorEvidenceMissing", "controlledStatusMissing"]
    }),
    definition({
      mappingId: "planning-map.pp.security.permissions.confirmation",
      ruleId: "pp.security.permissions.confirmation",
      gateId: "security",
      classification: "unsupportedProjection",
      answerSchemaSource: "staticRule",
      canonicalDestinationPaths: [
        "powerPlatform.common.authenticationRequirements",
        "powerPlatform.common.authorizationRequirements",
        "powerPlatform.common.recordAccessRules",
        "powerPlatform.common.auditRequirements",
        "powerPlatform.common.privacyRequirements",
        "powerPlatform.common.securityReviewStatus"
      ],
      canonicalMergePaths: [],
      canonicalValidatorDependencyPaths: [],
      validatorId: "calculateSecurityReviewGate",
      missingFactCodes: ["securityModelMismatch", "architectApprovalMissing"]
    }),
    definition({
      mappingId: "planning-map.pp.testing.outcomes.confirmation",
      ruleId: "pp.testing.outcomes.confirmation",
      gateId: "testing",
      classification: "unsupportedProjection",
      answerSchemaSource: "staticRule",
      canonicalDestinationPaths: [
        "powerPlatform.common.functionalTesting",
        "powerPlatform.common.connectorTesting",
        "powerPlatform.common.permissionTesting",
        "powerPlatform.common.securityTesting",
        "powerPlatform.common.accessibilityTesting",
        "powerPlatform.common.performanceTesting",
        "powerPlatform.common.volumeTesting",
        "powerPlatform.common.integrationTesting",
        "powerPlatform.common.regressionTesting",
        "powerPlatform.common.userAcceptanceTesting",
        "powerPlatform.common.deploymentTesting",
        "powerPlatform.common.productionSmokeTesting",
        "powerPlatform.common.testingPlanConfirmationStatus"
      ],
      canonicalMergePaths: [],
      canonicalValidatorDependencyPaths: [],
      validatorId: "calculateTestingPreparationGate",
      missingFactCodes: ["testingCategoryMissing", "architectApprovalMissing"]
    }),
    definition({
      mappingId: "planning-map.pp.alm.rollback.confirmation",
      ruleId: "pp.alm.rollback.confirmation",
      gateId: "alm",
      classification: "unsupportedProjection",
      answerSchemaSource: "staticRule",
      canonicalDestinationPaths: [
        "powerPlatform.common.sourceControlApproach",
        "powerPlatform.common.gitIntegration",
        "powerPlatform.common.powerPlatformCliAvailability",
        "powerPlatform.common.deploymentMethod",
        "powerPlatform.common.deploymentResponsibility",
        "powerPlatform.common.deploymentStrategy",
        "powerPlatform.common.connectionReferences",
        "powerPlatform.common.environmentVariables",
        "powerPlatform.common.pipelineRequirements",
        "powerPlatform.common.rollbackExpectations",
        "powerPlatform.common.releaseApprovalResponsibility",
        "powerPlatform.common.almConfirmationStatus"
      ],
      canonicalMergePaths: [],
      canonicalValidatorDependencyPaths: [],
      validatorId: "calculateAlmGate",
      missingFactCodes: ["almStrategyMismatch", "architectApprovalMissing"]
    }),
    definition({
      mappingId: "planning-map.pp.release.approval.confirmation",
      ruleId: "pp.release.approval.confirmation",
      gateId: "releaseApproval",
      classification: "partialProjection",
      answerSchemaSource: "staticRule",
      canonicalDestinationPaths: [
        "powerPlatform.common.releaseApprovalResponsibility",
        "powerPlatform.common.releaseApprover",
        "powerPlatform.common.releaseApprovalStatus"
      ],
      canonicalMergePaths: [],
      canonicalValidatorDependencyPaths: [],
      validatorId: "releaseApproval phase-gate evaluator",
      missingFactCodes: [
        "releaseAuthorizationMissing",
        "releaseEvidenceDestinationMissing",
        "controlledStatusMissing",
        "architectApprovalMissing"
      ]
    })
  ]
} as const satisfies PlanningReadinessMappingRegistry;

const validated = validatePlanningReadinessMappingRegistry(PRODUCTION_REGISTRY_INPUT);
if (validated.outcome === "invalid") {
  throw new Error(`Invalid production Planning readiness mapping registry: ${validated.issues.map((entry) => entry.message).join(" ")}`);
}

const PRODUCTION_REGISTRY = deepFreeze(validated.registry);

export function getProductionPlanningReadinessMappingRegistry(): PlanningReadinessMappingRegistry {
  return PRODUCTION_REGISTRY;
}

export function getProductionPlanningReadinessMappings(): readonly PlanningReadinessMappingDefinition[] {
  return PRODUCTION_REGISTRY.definitions;
}

export function getProductionPlanningReadinessMapping(
  ruleId: string
): PlanningReadinessMappingDefinition | undefined {
  return PRODUCTION_REGISTRY.definitions.find((candidate) => candidate.ruleId === ruleId);
}

export function validateProductionPlanningReadinessMappingRegistry() {
  return validatePlanningReadinessMappingRegistry(PRODUCTION_REGISTRY);
}

function deepFreeze<T>(input: T): T {
  if (typeof input !== "object" || input === null || Object.isFrozen(input)) return input;
  Object.freeze(input);
  Object.values(input).forEach((value) => deepFreeze(value));
  return input;
}
