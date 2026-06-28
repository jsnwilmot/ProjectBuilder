import { useMemo, useState } from "react";
import { DOCUMENT_LOCATIONS, PROJECT_FOLDERS } from "../../data/folderStructure";
import { createProjectArchive, downloadArchive } from "../../lib/exportProjectPackage";
import { validateExportPackage } from "../../lib/exportIntegrity";
import type { ProjectPackage, ProjectRecord } from "../../types/project";
import { Check, CircleAlert, Copy, Download, FileText, FolderArchive } from "../ui/Icons";

interface ExportPanelProps {
  project: ProjectRecord | null;
  projectPackage: ProjectPackage | null;
  onOpenGenerate: () => void;
}

type ExportState = "idle" | "working" | "complete" | "error";

interface ExportAttempt {
  state: "complete" | "error";
  message: string;
  attemptedAt: string;
}

const copyDocuments = [
  { fileName: "ARCHITECT_INSTRUCTIONS.md", label: "Copy Architect Instructions" },
  { fileName: "CODEX_INSTRUCTIONS.md", label: "Copy Codex Instructions" },
  { fileName: "PHASED_CODEX_PROMPTS.md", label: "Copy Phased Codex Prompts" }
] as const;

const attemptTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short"
});

function formatAttemptTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : attemptTimeFormatter.format(date);
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Use the local selection fallback when clipboard permission is unavailable.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard access is unavailable in this browser.");
}

export function ExportPanel({
  project,
  projectPackage,
  onOpenGenerate
}: ExportPanelProps) {
  const integrity = useMemo(() => validateExportPackage(project), [project]);
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [lastAttempt, setLastAttempt] = useState<ExportAttempt | null>(null);
  const [copyStatus, setCopyStatus] = useState("");

  const ready = Boolean(project && projectPackage && integrity.isValid);
  const statusLabel = exportState === "working"
    ? "Exporting"
    : exportState === "complete"
      ? "Export complete"
      : exportState === "error"
        ? "Export failed"
        : !ready
          ? "Cannot export yet"
          : integrity.warnings.length > 0
            ? "Warnings present"
            : "Ready to export";

  const exportPackage = async () => {
    if (!project || !integrity.isValid) {
      setExportState("error");
      setLastAttempt({
        state: "error",
        message: integrity.errors[0] ?? "The active project is not ready to export.",
        attemptedAt: new Date().toISOString()
      });
      return;
    }

    setExportState("working");
    try {
      const blob = await createProjectArchive(project, { exportedAt: integrity.generatedAt });
      downloadArchive(blob, `${integrity.manifestSummary.rootFolder}.zip`);
      setExportState("complete");
      setLastAttempt({
        state: "complete",
        message: "Package downloaded successfully.",
        attemptedAt: new Date().toISOString()
      });
    } catch (caughtError) {
      const message = caughtError instanceof Error
        ? caughtError.message
        : "The project archive could not be created.";
      setExportState("error");
      setLastAttempt({ state: "error", message, attemptedAt: new Date().toISOString() });
    }
  };

  const copyGeneratedDocument = async (fileName: string, label: string) => {
    const document = project?.generatedDocuments.find((candidate) => candidate.fileName === fileName);
    if (!document) {
      setCopyStatus("Generate the package before copying instructions.");
      return;
    }
    try {
      await copyText(document.content);
      setCopyStatus(`${label.replace("Copy ", "")} copied.`);
    } catch (caughtError) {
      setCopyStatus(caughtError instanceof Error ? caughtError.message : "Copy failed.");
    }
  };

  return (
    <main className="page export-page" id="main-content">
      <div className="page-heading">
        <div>
          <h1>Project Export</h1>
          <p>Create a verified project package for Architect review and phased Codex development.</p>
        </div>
      </div>

      <div className="export-layout">
        <section
          className="export-summary"
          aria-labelledby="export-package-title"
          aria-busy={exportState === "working"}
        >
          <span className={`export-icon ${ready ? "" : "is-blocked"}`}>
            {ready ? <FolderArchive size={30} aria-hidden="true" /> : <CircleAlert size={30} aria-hidden="true" />}
          </span>
          <div
            className={`export-status ${ready ? "is-ready" : "is-blocked"}`}
            role="status"
            aria-live="polite"
          >
            {statusLabel}
          </div>
          <h2 id="export-package-title">{integrity.manifestSummary.rootFolder}.zip</h2>
          <p>
            {ready
              ? "Includes 16 verified core documents plus Markdown and JSON diagnostic manifests."
              : "Generate and save the active project package before downloading a ZIP."}
          </p>

          <dl>
            <div><dt>Core documents</dt><dd>{integrity.fileCount}/{integrity.expectedFileCount}</dd></div>
            <div><dt>Warnings</dt><dd>{integrity.warnings.length}</dd></div>
            <div><dt>Errors</dt><dd>{integrity.errors.length}</dd></div>
          </dl>

          {ready ? (
            <button
              className="button button-primary button-large export-button"
              onClick={exportPackage}
              disabled={exportState === "working"}
            >
              {exportState === "working" ? "Building verified package…" : "Download verified package"}
              <Download size={18} aria-hidden="true" />
            </button>
          ) : (
            <button className="button button-primary button-large export-button" onClick={onOpenGenerate}>
              Generate project package first
            </button>
          )}

          {lastAttempt ? (
            <p className={`export-message ${lastAttempt.state === "complete" ? "success" : "error"}`} aria-live="polite">
              {lastAttempt.state === "complete"
                ? <Check size={16} aria-hidden="true" />
                : <CircleAlert size={16} aria-hidden="true" />}
              <span>
                {lastAttempt.message}{" "}
                <time dateTime={lastAttempt.attemptedAt}>{formatAttemptTime(lastAttempt.attemptedAt)}</time>
              </span>
            </p>
          ) : (
            <p className="export-attempt">Last export attempt: none in this session.</p>
          )}

          <div className="copy-actions">
            <h3>Copy generated handoff content</h3>
            {copyDocuments.map(({ fileName, label }) => (
              <button
                key={fileName}
                className="button button-secondary"
                onClick={() => copyGeneratedDocument(fileName, label)}
                disabled={!project?.generatedDocuments.some((document) => document.fileName === fileName)}
              >
                <Copy size={15} aria-hidden="true" />
                {label}
              </button>
            ))}
            {copyStatus ? <p aria-live="polite">{copyStatus}</p> : null}
          </div>
        </section>

        <section className="package-contents" aria-labelledby="package-contents-title">
          <div className="section-heading">
            <div>
              <h2 id="package-contents-title">Export diagnostics</h2>
              <p>Integrity results for the active persisted project.</p>
            </div>
          </div>

          <div className="export-diagnostics">
            <dl>
              <div><dt>Package root</dt><dd>{integrity.manifestSummary.rootFolder}/</dd></div>
              <div><dt>Expected documents</dt><dd>{integrity.expectedFileCount}</dd></div>
              <div><dt>Actual documents</dt><dd>{integrity.fileCount}</dd></div>
              <div><dt>Manifest included</dt><dd>Yes, when export is valid</dd></div>
              <div><dt>Folder mapping</dt><dd>{integrity.folderMapStatus}</dd></div>
              <div><dt>Missing markers</dt><dd>{integrity.manifestSummary.missingMarkerCount}</dd></div>
            </dl>

            <DiagnosticList title="Missing files" items={integrity.missingFiles} emptyText="No missing core files." />
            <DiagnosticList title="Warnings" items={integrity.warnings} emptyText="No export warnings." tone="warning" />
            <DiagnosticList title="Errors" items={integrity.errors} emptyText="No export errors." tone="error" />
          </div>

          <div className="folder-tree" aria-label="Export folder structure">
            <div className="tree-root"><FolderArchive size={18} />{integrity.manifestSummary.rootFolder}/</div>
            {PROJECT_FOLDERS.map((folder) => {
              const fileCount = DOCUMENT_LOCATIONS.filter((document) => document.folder === folder).length;
              return (
                <div className="tree-folder" key={folder}>
                  <FolderArchive size={16} />
                  <span>{folder}/</span>
                  <small>{fileCount} core document{fileCount === 1 ? "" : "s"}</small>
                </div>
              );
            })}
            <div className="tree-file"><FileText size={16} />00_Project_Overview/EXPORT_MANIFEST.md</div>
            <div className="tree-file"><FileText size={16} />project-manifest.json</div>
          </div>
        </section>
      </div>
    </main>
  );
}

function DiagnosticList({
  title,
  items,
  emptyText,
  tone = "neutral"
}: {
  title: string;
  items: string[];
  emptyText: string;
  tone?: "neutral" | "warning" | "error";
}) {
  return (
    <div className={`diagnostic-list ${tone}`}>
      <h3>{title}</h3>
      {items.length > 0
        ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
        : <p><Check size={14} aria-hidden="true" />{emptyText}</p>}
    </div>
  );
}
