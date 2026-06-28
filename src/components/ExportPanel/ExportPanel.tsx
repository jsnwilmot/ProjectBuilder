import { useState } from "react";
import { createProjectArchive, downloadArchive } from "../../lib/exportProjectPackage";
import type { ProjectPackage, ValidationIssue } from "../../types/project";
import { Check, CircleAlert, Download, FileText, FolderArchive } from "../ui/Icons";

interface ExportPanelProps {
  projectPackage: ProjectPackage | null;
  validationIssues: ValidationIssue[];
  onGenerated: () => void;
  onReturnToIntake: () => void;
}

export function ExportPanel({
  projectPackage,
  validationIssues,
  onGenerated,
  onReturnToIntake
}: ExportPanelProps) {
  const [exportState, setExportState] = useState<"idle" | "working" | "complete" | "error">("idle");
  const [error, setError] = useState("");

  const exportPackage = async () => {
    if (!projectPackage) return;
    setExportState("working");
    setError("");
    try {
      const blob = await createProjectArchive(projectPackage);
      downloadArchive(blob, `${projectPackage.rootFolder}.zip`);
      onGenerated();
      setExportState("complete");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The project archive could not be created.");
      setExportState("error");
    }
  };

  return (
    <main className="page export-page" id="main-content">
      <div className="page-heading">
        <div>
          <h1>Project Export</h1>
          <p>Create a predictable handoff package for Architect review and phased Codex development.</p>
        </div>
      </div>

      {!projectPackage ? (
        <section className="export-blocked">
          <CircleAlert size={28} aria-hidden="true" />
          <div>
            <h2>Export is blocked</h2>
            <p>Complete {validationIssues.length} required field{validationIssues.length === 1 ? "" : "s"} before generating the package.</p>
            <ul>{validationIssues.map((issue) => <li key={issue.field}>{issue.message}</li>)}</ul>
            <button className="button button-primary" onClick={onReturnToIntake}>Complete intake</button>
          </div>
        </section>
      ) : (
        <div className="export-layout">
          <section className="export-summary">
            <span className="export-icon"><FolderArchive size={30} aria-hidden="true" /></span>
            <h2>{projectPackage.rootFolder}.zip</h2>
            <p>
              Includes the complete standard folder structure, 16 generated Markdown files,
              and a machine-readable package manifest.
            </p>
            <dl>
              <div><dt>Folders</dt><dd>{projectPackage.folders.length}</dd></div>
              <div><dt>Documents</dt><dd>{projectPackage.documents.length}</dd></div>
              <div><dt>External transfer</dt><dd>None</dd></div>
            </dl>
            <button
              className="button button-primary button-large export-button"
              onClick={exportPackage}
              disabled={exportState === "working"}
            >
              {exportState === "working" ? "Building package…" : "Download project package"}
              <Download size={18} aria-hidden="true" />
            </button>
            {exportState === "complete" ? <p className="export-message success"><Check size={16} />Package downloaded successfully.</p> : null}
            {exportState === "error" ? <p className="export-message error"><CircleAlert size={16} />{error}</p> : null}
          </section>

          <section className="package-contents" aria-labelledby="package-contents-title">
            <div className="section-heading">
              <div>
                <h2 id="package-contents-title">Package contents</h2>
                <p>Every required folder and generated file is represented.</p>
              </div>
            </div>
            <div className="folder-tree">
              <div className="tree-root"><FolderArchive size={18} />{projectPackage.rootFolder}/</div>
              <div className="tree-file"><FileText size={16} />README.md</div>
              {projectPackage.folders.map((folder) => {
                const fileCount = projectPackage.documents.filter((document) => document.folder === folder).length;
                return (
                  <div className="tree-folder" key={folder}>
                    <FolderArchive size={16} />
                    <span>{folder}/</span>
                    <small>{fileCount} file{fileCount === 1 ? "" : "s"}</small>
                  </div>
                );
              })}
              <div className="tree-file"><FileText size={16} />project-manifest.json</div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
