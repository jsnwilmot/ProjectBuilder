import { DOCUMENT_LOCATIONS } from "../data/folderStructure";
import { createProject } from "../lib/createProject";
import { createExportManifest, renderExportManifestMarkdown } from "../lib/exportManifest";
import { validateExportPackage } from "../lib/exportIntegrity";
import { expectedDocumentLocations } from "../lib/powerPlatform";
import { createGeneratedProject } from "./helpers/generatedProject";

describe("export manifest", () => {
  it("creates a stable diagnostic object and Markdown file", () => {
    const project = createGeneratedProject();
    const integrity = validateExportPackage(project, "2026-06-28T18:00:00.000Z");
    const manifest = createExportManifest(project, integrity);
    const markdown = renderExportManifestMarkdown(manifest);

    expect(manifest.packageSchemaVersion).toBe(2);
    expect(manifest.activeProjectId).toBe(project.identity.id);
    expect(manifest.generatedDocumentCount).toBe(DOCUMENT_LOCATIONS.length);
    expect(manifest.expectedDocumentCount).toBe(DOCUMENT_LOCATIONS.length);
    expect(manifest.files).toHaveLength(DOCUMENT_LOCATIONS.length);
    expect(manifest.readiness).toBe("Ready for Codex");
    expect(manifest.files[0]).toEqual({
      fileName: "README.md",
      folder: "00_Project_Overview",
      path: "00_Project_Overview/README.md"
    });
    expect(markdown).toContain("# Export Manifest");
    expect(markdown).toContain("| Exported date | 2026-06-28T18:00:00.000Z |");
    expect(markdown).toContain("| Package readiness | Ready for Codex |");
    expect(markdown).toContain("00_Project_Overview/EXPORT_MANIFEST.md");
  });

  it("uses project-aware expected folder counts for conditional document sets", () => {
    const modelDriven = createGeneratedProject(createProject({
      identity: { id: "model", projectName: "Model" },
      intake: { appType: "powerAppsModelDriven" }
    }));

    const manifest = createExportManifest(modelDriven, validateExportPackage(modelDriven, "2026-06-28T18:00:00.000Z"));
    const countsFromFiles = manifest.files.reduce((acc, file) => {
      acc.set(file.folder, (acc.get(file.folder) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());

    for (const folder of manifest.folderStructure) {
      expect(folder.expectedFileCount).toBe(countsFromFiles.get(folder.folder) ?? 0);
    }
  });

  it("computes dynamic folder summaries for non-power-platform, canvas backend variants, and model-driven projects", () => {
    const nonPowerPlatform = createGeneratedProject(createProject({
      identity: { id: "std", projectName: "Standard" },
      intake: { appType: "webApplication" }
    }));

    const sharePointCanvas = createGeneratedProject(createProject({
      identity: { id: "sp", projectName: "SharePoint Canvas" },
      intake: { appType: "powerAppsCanvas" },
      powerPlatform: {
        common: {
          appSubtype: "",
          tenant: "",
          environment: "",
          environmentType: "",
          developmentEnvironment: "",
          testEnvironment: "",
          productionEnvironment: "",
          businessOwner: "",
          appOwner: "",
          technicalOwner: "",
          supportOwner: "",
          expectedUserCount: "",
          existingLicences: "",
          licensingStatus: "",
          licensingAssumptions: "",
          outstandingLicensingDecisions: "",
          solutionAware: "",
          solutionName: "",
          solutionUniqueName: "",
          publisherName: "",
          publisherPrefix: "",
          sourceControlApproach: "",
          almApproach: "",
          deploymentMethod: "",
          authenticationRequirements: "",
          authorizationRequirements: "",
          accessibilityRequirements: "",
          complianceRequirements: "",
          dataClassification: "",
          dataRetentionRequirements: "",
          auditRequirements: "",
          connectors: []
        },
        canvas: {
          subtype: "",
          responsiveMode: "",
          targetDevices: "",
          targetScreenSizes: "",
          orientation: "",
          controlGeneration: "",
          primaryDataSourceType: "sharePointList",
          primaryConnectorId: "",
          secondaryConnectorIds: [],
          sharePointSites: "",
          sharePointLists: "Main List",
          sharePointLibraries: "",
          dataverseTables: "",
          otherDataSources: "",
          expectedRecordCounts: "",
          offlineRequirements: "",
          synchronizationRequirements: "",
          attachmentRequirements: "",
          fileRequirements: "",
          screens: "",
          containers: "",
          components: "",
          controls: "",
          namedFormulas: "",
          globalVariables: "",
          contextVariables: "",
          collections: "",
          schemaStatus: "",
          internalNameStatus: "",
          logicalNameStatus: "",
          powerFxStatus: "",
          yamlStatus: "",
          delegationStatus: "",
          manualInstallationStatus: "",
          studioValidationStatus: "",
          publicationStatus: "",
          deploymentStatus: ""
        },
        progress: {
          connectorSelection: "notStarted",
          connectorClassification: "notStarted",
          licensing: "notStarted",
          environment: "notStarted",
          schema: "notStarted",
          nameConfirmation: "notStarted",
          securityReview: "notStarted",
          testing: "notStarted",
          manualImplementation: "notStarted",
          deployment: "notStarted",
          canvas: {
            sharePointSchema: "notStarted",
            dataverseSchema: "notStarted",
            connectorSchema: "notStarted",
            internalNames: "notStarted",
            logicalNames: "notStarted",
            powerFx: "notStarted",
            yaml: "notStarted",
            delegation: "notStarted",
            studioValidation: "notStarted",
            publication: "notStarted"
          },
          modelDriven: {
            dataverseAvailability: "notStarted",
            modelDrivenLicensing: "notStarted",
            publisher: "notStarted",
            dataverseSchema: "notStarted",
            logicalNames: "notStarted",
            solutionArchitecture: "notStarted",
            solutionComponents: "notStarted",
            securityRoles: "notStarted",
            automation: "notStarted",
            extensions: "notStarted",
            sourceAvailability: "notStarted",
            solutionValidation: "notStarted",
            solutionImport: "notStarted",
            publication: "notStarted"
          }
        }
      }
    }));

    const dataverseCanvas = createGeneratedProject(createProject({
      identity: { id: "dv", projectName: "Dataverse Canvas" },
      intake: { appType: "powerAppsCanvas" },
      powerPlatform: {
        common: {
          appSubtype: "",
          tenant: "",
          environment: "",
          environmentType: "",
          developmentEnvironment: "",
          testEnvironment: "",
          productionEnvironment: "",
          businessOwner: "",
          appOwner: "",
          technicalOwner: "",
          supportOwner: "",
          expectedUserCount: "",
          existingLicences: "",
          licensingStatus: "",
          licensingAssumptions: "",
          outstandingLicensingDecisions: "",
          solutionAware: "",
          solutionName: "",
          solutionUniqueName: "",
          publisherName: "",
          publisherPrefix: "",
          sourceControlApproach: "",
          almApproach: "",
          deploymentMethod: "",
          authenticationRequirements: "",
          authorizationRequirements: "",
          accessibilityRequirements: "",
          complianceRequirements: "",
          dataClassification: "",
          dataRetentionRequirements: "",
          auditRequirements: "",
          connectors: []
        },
        canvas: {
          subtype: "",
          responsiveMode: "",
          targetDevices: "",
          targetScreenSizes: "",
          orientation: "",
          controlGeneration: "",
          primaryDataSourceType: "dataverse",
          primaryConnectorId: "",
          secondaryConnectorIds: [],
          sharePointSites: "",
          sharePointLists: "",
          sharePointLibraries: "",
          dataverseTables: "Accounts",
          otherDataSources: "",
          expectedRecordCounts: "",
          offlineRequirements: "",
          synchronizationRequirements: "",
          attachmentRequirements: "",
          fileRequirements: "",
          screens: "",
          containers: "",
          components: "",
          controls: "",
          namedFormulas: "",
          globalVariables: "",
          contextVariables: "",
          collections: "",
          schemaStatus: "",
          internalNameStatus: "",
          logicalNameStatus: "",
          powerFxStatus: "",
          yamlStatus: "",
          delegationStatus: "",
          manualInstallationStatus: "",
          studioValidationStatus: "",
          publicationStatus: "",
          deploymentStatus: ""
        },
        progress: {
          connectorSelection: "notStarted",
          connectorClassification: "notStarted",
          licensing: "notStarted",
          environment: "notStarted",
          schema: "notStarted",
          nameConfirmation: "notStarted",
          securityReview: "notStarted",
          testing: "notStarted",
          manualImplementation: "notStarted",
          deployment: "notStarted",
          canvas: {
            sharePointSchema: "notStarted",
            dataverseSchema: "notStarted",
            connectorSchema: "notStarted",
            internalNames: "notStarted",
            logicalNames: "notStarted",
            powerFx: "notStarted",
            yaml: "notStarted",
            delegation: "notStarted",
            studioValidation: "notStarted",
            publication: "notStarted"
          },
          modelDriven: {
            dataverseAvailability: "notStarted",
            modelDrivenLicensing: "notStarted",
            publisher: "notStarted",
            dataverseSchema: "notStarted",
            logicalNames: "notStarted",
            solutionArchitecture: "notStarted",
            solutionComponents: "notStarted",
            securityRoles: "notStarted",
            automation: "notStarted",
            extensions: "notStarted",
            sourceAvailability: "notStarted",
            solutionValidation: "notStarted",
            solutionImport: "notStarted",
            publication: "notStarted"
          }
        }
      }
    }));

    const mixedCanvas = createGeneratedProject(createProject({
      identity: { id: "mix", projectName: "Mixed Canvas" },
      intake: { appType: "powerAppsCanvas" },
      powerPlatform: {
        common: {
          appSubtype: "",
          tenant: "",
          environment: "",
          environmentType: "",
          developmentEnvironment: "",
          testEnvironment: "",
          productionEnvironment: "",
          businessOwner: "",
          appOwner: "",
          technicalOwner: "",
          supportOwner: "",
          expectedUserCount: "",
          existingLicences: "",
          licensingStatus: "",
          licensingAssumptions: "",
          outstandingLicensingDecisions: "",
          solutionAware: "",
          solutionName: "",
          solutionUniqueName: "",
          publisherName: "",
          publisherPrefix: "",
          sourceControlApproach: "",
          almApproach: "",
          deploymentMethod: "",
          authenticationRequirements: "",
          authorizationRequirements: "",
          accessibilityRequirements: "",
          complianceRequirements: "",
          dataClassification: "",
          dataRetentionRequirements: "",
          auditRequirements: "",
          connectors: [{
            id: "dv",
            displayName: "Dataverse",
            purpose: "Data",
            dataSourceName: "Dataverse",
            dataSourceType: "dataverse",
            connectorClassification: "unknown",
            classificationConfirmed: false,
            licenceRequirement: "",
            licensingConfirmed: false,
            authenticationMethod: "",
            gatewayRequirement: "",
            environmentRequirement: "",
            dlpImpact: "",
            delegationSupport: "",
            expectedRecordVolume: "",
            supportedOperations: {},
            offlineSupport: "",
            securityNotes: "",
            limitations: "",
            approvalStatus: ""
          }]
        },
        canvas: {
          subtype: "",
          responsiveMode: "",
          targetDevices: "",
          targetScreenSizes: "",
          orientation: "",
          controlGeneration: "",
          primaryDataSourceType: "sharePointList",
          primaryConnectorId: "",
          secondaryConnectorIds: ["dv"],
          sharePointSites: "",
          sharePointLists: "Main List",
          sharePointLibraries: "",
          dataverseTables: "",
          otherDataSources: "",
          expectedRecordCounts: "",
          offlineRequirements: "",
          synchronizationRequirements: "",
          attachmentRequirements: "",
          fileRequirements: "",
          screens: "",
          containers: "",
          components: "",
          controls: "",
          namedFormulas: "",
          globalVariables: "",
          contextVariables: "",
          collections: "",
          schemaStatus: "",
          internalNameStatus: "",
          logicalNameStatus: "",
          powerFxStatus: "",
          yamlStatus: "",
          delegationStatus: "",
          manualInstallationStatus: "",
          studioValidationStatus: "",
          publicationStatus: "",
          deploymentStatus: ""
        },
        progress: {
          connectorSelection: "notStarted",
          connectorClassification: "notStarted",
          licensing: "notStarted",
          environment: "notStarted",
          schema: "notStarted",
          nameConfirmation: "notStarted",
          securityReview: "notStarted",
          testing: "notStarted",
          manualImplementation: "notStarted",
          deployment: "notStarted",
          canvas: {
            sharePointSchema: "notStarted",
            dataverseSchema: "notStarted",
            connectorSchema: "notStarted",
            internalNames: "notStarted",
            logicalNames: "notStarted",
            powerFx: "notStarted",
            yaml: "notStarted",
            delegation: "notStarted",
            studioValidation: "notStarted",
            publication: "notStarted"
          },
          modelDriven: {
            dataverseAvailability: "notStarted",
            modelDrivenLicensing: "notStarted",
            publisher: "notStarted",
            dataverseSchema: "notStarted",
            logicalNames: "notStarted",
            solutionArchitecture: "notStarted",
            solutionComponents: "notStarted",
            securityRoles: "notStarted",
            automation: "notStarted",
            extensions: "notStarted",
            sourceAvailability: "notStarted",
            solutionValidation: "notStarted",
            solutionImport: "notStarted",
            publication: "notStarted"
          }
        }
      }
    }));

    const otherConnectorCanvas = createGeneratedProject(createProject({
      identity: { id: "other", projectName: "Other Connector Canvas" },
      intake: { appType: "powerAppsCanvas" },
      powerPlatform: {
        common: {
          appSubtype: "",
          tenant: "",
          environment: "",
          environmentType: "",
          developmentEnvironment: "",
          testEnvironment: "",
          productionEnvironment: "",
          businessOwner: "",
          appOwner: "",
          technicalOwner: "",
          supportOwner: "",
          expectedUserCount: "",
          existingLicences: "",
          licensingStatus: "",
          licensingAssumptions: "",
          outstandingLicensingDecisions: "",
          solutionAware: "",
          solutionName: "",
          solutionUniqueName: "",
          publisherName: "",
          publisherPrefix: "",
          sourceControlApproach: "",
          almApproach: "",
          deploymentMethod: "",
          authenticationRequirements: "",
          authorizationRequirements: "",
          accessibilityRequirements: "",
          complianceRequirements: "",
          dataClassification: "",
          dataRetentionRequirements: "",
          auditRequirements: "",
          connectors: []
        },
        canvas: {
          subtype: "",
          responsiveMode: "",
          targetDevices: "",
          targetScreenSizes: "",
          orientation: "",
          controlGeneration: "",
          primaryDataSourceType: "otherConnector",
          primaryConnectorId: "",
          secondaryConnectorIds: [],
          sharePointSites: "",
          sharePointLists: "",
          sharePointLibraries: "",
          dataverseTables: "",
          otherDataSources: "Custom API",
          expectedRecordCounts: "",
          offlineRequirements: "",
          synchronizationRequirements: "",
          attachmentRequirements: "",
          fileRequirements: "",
          screens: "",
          containers: "",
          components: "",
          controls: "",
          namedFormulas: "",
          globalVariables: "",
          contextVariables: "",
          collections: "",
          schemaStatus: "",
          internalNameStatus: "",
          logicalNameStatus: "",
          powerFxStatus: "",
          yamlStatus: "",
          delegationStatus: "",
          manualInstallationStatus: "",
          studioValidationStatus: "",
          publicationStatus: "",
          deploymentStatus: ""
        },
        progress: {
          connectorSelection: "notStarted",
          connectorClassification: "notStarted",
          licensing: "notStarted",
          environment: "notStarted",
          schema: "notStarted",
          nameConfirmation: "notStarted",
          securityReview: "notStarted",
          testing: "notStarted",
          manualImplementation: "notStarted",
          deployment: "notStarted",
          canvas: {
            sharePointSchema: "notStarted",
            dataverseSchema: "notStarted",
            connectorSchema: "notStarted",
            internalNames: "notStarted",
            logicalNames: "notStarted",
            powerFx: "notStarted",
            yaml: "notStarted",
            delegation: "notStarted",
            studioValidation: "notStarted",
            publication: "notStarted"
          },
          modelDriven: {
            dataverseAvailability: "notStarted",
            modelDrivenLicensing: "notStarted",
            publisher: "notStarted",
            dataverseSchema: "notStarted",
            logicalNames: "notStarted",
            solutionArchitecture: "notStarted",
            solutionComponents: "notStarted",
            securityRoles: "notStarted",
            automation: "notStarted",
            extensions: "notStarted",
            sourceAvailability: "notStarted",
            solutionValidation: "notStarted",
            solutionImport: "notStarted",
            publication: "notStarted"
          }
        }
      }
    }));

    const modelDriven = createGeneratedProject(createProject({
      identity: { id: "model", projectName: "Model" },
      intake: { appType: "powerAppsModelDriven" }
    }));

    const scenarios = [
      { name: "standard", project: nonPowerPlatform },
      { name: "sharepoint", project: sharePointCanvas },
      { name: "dataverse", project: dataverseCanvas },
      { name: "mixed", project: mixedCanvas },
      { name: "other", project: otherConnectorCanvas },
      { name: "model", project: modelDriven }
    ];

    for (const scenario of scenarios) {
      const expectedLocations = expectedDocumentLocations(scenario.project);
      const expectedPaths = expectedLocations.map((location) => `${location.folder}/${location.fileName}`);
      expect(new Set(expectedPaths).size).toBe(expectedPaths.length);

      const manifest = createExportManifest(
        scenario.project,
        validateExportPackage(scenario.project, "2026-06-28T18:00:00.000Z")
      );
      const expectedByFolder = expectedLocations.reduce((acc, location) => {
        acc.set(location.folder, (acc.get(location.folder) ?? 0) + 1);
        return acc;
      }, new Map<string, number>());
      const summaryTotal = manifest.folderStructure.reduce((sum, folder) => sum + folder.expectedFileCount, 0);

      expect(summaryTotal).toBe(expectedLocations.length);
      for (const folder of manifest.folderStructure) {
        expect(folder.expectedFileCount).toBe(expectedByFolder.get(folder.folder) ?? 0);
      }
    }

    const sharePointFiles = expectedDocumentLocations(sharePointCanvas).map((location) => location.fileName);
    expect(sharePointFiles).toContain("SHAREPOINT_SCHEMA.md");
    expect(sharePointFiles).not.toContain("DATAVERSE_SCHEMA.md");

    const dataverseFiles = expectedDocumentLocations(dataverseCanvas).map((location) => location.fileName);
    expect(dataverseFiles).toContain("DATAVERSE_SCHEMA.md");
    expect(dataverseFiles).not.toContain("SHAREPOINT_SCHEMA.md");

    const mixedFiles = expectedDocumentLocations(mixedCanvas).map((location) => location.fileName);
    expect(mixedFiles).toContain("SHAREPOINT_SCHEMA.md");
    expect(mixedFiles).toContain("DATAVERSE_SCHEMA.md");

    const otherConnectorFiles = expectedDocumentLocations(otherConnectorCanvas).map((location) => location.fileName);
    expect(otherConnectorFiles).toContain("CONNECTOR_SCHEMA.md");

    const modelFiles = expectedDocumentLocations(modelDriven).map((location) => location.fileName);
    expect(modelFiles).toEqual(expect.arrayContaining([
      "DATAVERSE_SCHEMA.md",
      "SOLUTION_ARCHITECTURE.md",
      "SECURITY_ROLES.md"
    ]));
  });
});
