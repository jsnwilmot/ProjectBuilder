import { useState } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { AppNavigation, type AppView } from "../components/AppShell/AppNavigation";
import { DocumentViewer } from "../components/DocumentViewer/DocumentViewer";
import { ExportPanel } from "../components/ExportPanel/ExportPanel";
import { IntakeBuilder } from "../components/IntakeBuilder/IntakeBuilder";
import { MissionControl } from "../components/MissionControl/MissionControl";
import { ScopeReview } from "../components/ScopeReview/ScopeReview";
import { useProjectBuilder } from "./useProjectBuilder";

export function App() {
  const [view, setView] = useState<AppView>("dashboard");
  const [intakeStep, setIntakeStep] = useState(0);
  const {
    project,
    updateIntake,
    markGenerated,
    resetProject,
    validationIssues,
    outstandingFields,
    generatedPackage
  } = useProjectBuilder();

  const openIntake = (step = 0) => {
    setIntakeStep(step);
    setView("intake");
  };

  const startNewProject = () => {
    if (window.confirm("Start a new project? This replaces the current locally saved intake.")) {
      resetProject();
      setIntakeStep(0);
      setView("intake");
    }
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <AppNavigation currentView={view} onNavigate={setView} onNewProject={startNewProject} />
      <div className="app-content">
        <AppHeader onNewProject={startNewProject} />
        {view === "dashboard" ? (
          <MissionControl
            project={project}
            outstandingCount={outstandingFields.length}
            generatedCount={project.metadata.status === "Project Package Generated" ? 16 : 0}
            onContinue={openIntake}
          />
        ) : null}
        {view === "intake" ? (
          <IntakeBuilder
            intake={project.intake}
            currentStep={intakeStep}
            validationIssues={validationIssues}
            onStepChange={setIntakeStep}
            onUpdate={updateIntake}
            onReview={() => setView("scope")}
          />
        ) : null}
        {view === "scope" ? (
          <ScopeReview
            intake={project.intake}
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
            projectPackage={generatedPackage}
            validationIssues={validationIssues}
            onGenerated={markGenerated}
            onReturnToIntake={() => openIntake(0)}
          />
        ) : null}
      </div>
    </div>
  );
}
