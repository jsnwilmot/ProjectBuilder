import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { AppNavigation, type AppView } from "../components/AppShell/AppNavigation";
import { DocumentViewer } from "../components/DocumentViewer/DocumentViewer";
import { ExportPanel } from "../components/ExportPanel/ExportPanel";
import { IntakeBuilder } from "../components/IntakeBuilder/IntakeBuilder";
import { MissionControl } from "../components/MissionControl/MissionControl";
import { PlanningView } from "../components/Planning/PlanningView";
import { GENERATE_STAGE_INDEX, INTAKE_STAGES, REVIEW_STAGE_INDEX } from "../data/intakeStages";
import { useProjectBuilder } from "./useProjectBuilder";

export function App() {
  const [view, setView] = useState<AppView>("dashboard");
  const [intakeStep, setIntakeStep] = useState(0);
  const [meaningfulPlanningAnswerDrafts, setMeaningfulPlanningAnswerDrafts] = useState<Set<string>>(
    () => new Set()
  );
  const {
    project,
    projects,
    updateIntake,
    updatePowerPlatform,
    updateClientReviewItem,
    setReadinessConfirmation,
    markGenerated,
    createNewProject,
    setActiveProject,
    duplicateSavedProject,
    archiveSavedProject,
    restoreSavedProject,
    deleteSavedProject,
    submitPlanningClarificationDecision,
    validationIssues,
    validationResult,
    generatedPackage,
    persistenceWarning
  } = useProjectBuilder();

  const handlePlanningAnswerDraftMeaningfulChange = useCallback((proposalId: string, meaningful: boolean) => {
    setMeaningfulPlanningAnswerDrafts((current) => {
      const next = new Set(current);
      if (meaningful) next.add(proposalId);
      else next.delete(proposalId);
      if (next.size === current.size && [...next].every((entry) => current.has(entry))) return current;
      return next;
    });
  }, []);

  const confirmPlanningAnswerDiscard = () => {
    if (meaningfulPlanningAnswerDrafts.size === 0) return true;
    const confirmed = window.confirm(
      "Discard unsaved planning answer and continue? Select Cancel to keep editing."
    );
    if (confirmed) setMeaningfulPlanningAnswerDrafts(new Set());
    return confirmed;
  };

  useEffect(() => {
    if (meaningfulPlanningAnswerDrafts.size === 0) return undefined;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [meaningfulPlanningAnswerDrafts.size]);

  const openIntake = (step = 0) => {
    setIntakeStep(step);
    setView("intake");
    window.setTimeout(() => {
      document.getElementById("main-content")?.focus();
    }, 0);
  };

  const startNewProject = () => {
    if (!confirmPlanningAnswerDiscard()) return;
    createNewProject();
    setIntakeStep(0);
    setView("intake");
  };

  const handleNavigation = (nextView: AppView) => {
    if (view === "planning" && nextView !== "planning" && !confirmPlanningAnswerDiscard()) return;
    if (!project && nextView !== "dashboard") {
      setView("dashboard");
      return;
    }
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

  const navigationView: AppView = view === "intake" && intakeStep === REVIEW_STAGE_INDEX
    ? "scope"
    : view === "intake" && intakeStep === GENERATE_STAGE_INDEX
      ? "export"
      : view;

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById("main-content")?.focus()
        }}
      >
        Skip to main content
      </a>
      <AppNavigation currentView={navigationView} onNavigate={handleNavigation} onNewProject={startNewProject} />
      <div className="app-content">
        <AppHeader onNewProject={startNewProject} />
        {persistenceWarning ? (
          <div className="persistence-warning" role="status" aria-live="polite">
            {persistenceWarning}
          </div>
        ) : null}
        {view === "dashboard" ? (
          <MissionControl
            project={project}
            projects={projects}
            onContinue={openIntake}
            onCreateProject={startNewProject}
            onSelectProject={setActiveProject}
            onDuplicateProject={duplicateSavedProject}
            onArchiveProject={archiveSavedProject}
            onRestoreProject={restoreSavedProject}
            onDeleteProject={deleteSavedProject}
            onOpenView={(nextView, step) => {
              if (nextView === "intake") {
                openIntake(step ?? 0);
                return;
              }
              handleNavigation(nextView);
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
            onUpdatePowerPlatform={updatePowerPlatform}
            onUpdateReviewItem={updateClientReviewItem}
            onToggleReadiness={setReadinessConfirmation}
            onGenerate={generateAndOpenDocuments}
            onOpenDocuments={() => setView("documents")}
            onOpenExport={() => setView("export")}
          />
        ) : null}
        {view === "documents" ? (
          <DocumentViewer
            project={project}
            projectPackage={generatedPackage}
            onReturnToIntake={(stageId) => {
              const stageIndex = stageId ? INTAKE_STAGES.findIndex((stage) => stage.id === stageId) : -1;
              openIntake(stageIndex >= 0 ? stageIndex : 0);
            }}
          />
        ) : null}
        {view === "planning" && project ? (
          <PlanningView
            project={project}
            onSubmitClarificationDecision={submitPlanningClarificationDecision}
            onAnswerDraftMeaningfulChange={handlePlanningAnswerDraftMeaningfulChange}
          />
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
