import { useState } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { AppNavigation, type AppView } from "../components/AppShell/AppNavigation";
import { DocumentViewer } from "../components/DocumentViewer/DocumentViewer";
import { ExportPanel } from "../components/ExportPanel/ExportPanel";
import { IntakeBuilder } from "../components/IntakeBuilder/IntakeBuilder";
import { MissionControl } from "../components/MissionControl/MissionControl";
import { ScopeReview } from "../components/ScopeReview/ScopeReview";
import { GENERATE_STAGE_INDEX, REVIEW_STAGE_INDEX } from "../data/intakeStages";
import { useProjectBuilder } from "./useProjectBuilder";

export function App() {
  const [view, setView] = useState<AppView>("dashboard");
  const [intakeStep, setIntakeStep] = useState(0);
  const {
    project,
    projects,
    updateIntake,
    markGenerated,
    createNewProject,
    setActiveProject,
    validationIssues,
    validationResult,
    outstandingFields,
    generatedPackage
  } = useProjectBuilder();

  const openIntake = (step = 0) => {
    setIntakeStep(step);
    setView("intake");
  };

  const startNewProject = () => {
    createNewProject();
    setIntakeStep(0);
    setView("intake");
  };

  const handleNavigation = (nextView: AppView) => {
    if (nextView === "scope") {
      openIntake(REVIEW_STAGE_INDEX);
      return;
    }
    if (nextView === "export") {
      openIntake(GENERATE_STAGE_INDEX);
      return;
    }
    setView(nextView);
  };

  const generateAndOpenDocuments = () => {
    markGenerated();
    setView("documents");
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <AppNavigation currentView={view} onNavigate={handleNavigation} onNewProject={startNewProject} />
      <div className="app-content">
        <AppHeader onNewProject={startNewProject} />
        {view === "dashboard" ? (
          <MissionControl
            project={project}
            projects={projects}
            onContinue={openIntake}
            onSelectProject={setActiveProject}
            onOpenView={(nextView, step) => {
              if (nextView === "intake") openIntake(step ?? 0);
              else setView(nextView);
            }}
          />
        ) : null}
        {view === "intake" && project ? (
          <IntakeBuilder
            project={project}
            currentStep={intakeStep}
            validationResult={validationResult}
            validationIssues={validationIssues}
            onStepChange={setIntakeStep}
            onUpdate={updateIntake}
            onGenerate={generateAndOpenDocuments}
            onOpenDocuments={() => setView("documents")}
            onOpenExport={() => setView("export")}
          />
        ) : null}
        {view === "scope" && project ? (
          <ScopeReview
            project={project}
            issues={validationIssues}
            outstandingCount={outstandingFields.length}
            onEditStep={openIntake}
            onViewDocuments={() => setView("documents")}
          />
        ) : null}
        {view === "documents" ? (
          <DocumentViewer projectPackage={generatedPackage} onReturnToIntake={() => openIntake(0)} />
        ) : null}
        {view === "export" ? (
          <ExportPanel
            project={project}
            projectPackage={generatedPackage}
            onOpenGenerate={() => openIntake(GENERATE_STAGE_INDEX)}
          />
        ) : null}
      </div>
    </div>
  );
}
