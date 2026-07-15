import { useMemo, useState } from "react";
import { QUICK_COPY_DOCUMENTS } from "../../data/documentPurposes";
import { DOCUMENT_LOCATIONS } from "../../data/folderStructure";
import { getClientReviewReadiness } from "../../lib/clientReview";
import { copyText } from "../../lib/copyText";
import { getDocumentReviewItems } from "../../lib/documentReview";
import { validateExportPackage } from "../../lib/exportIntegrity";
import { evaluateGeneratedPackageReadiness } from "../../lib/generatedPackageReadiness";
import { expectedDocumentLocations } from "../../lib/powerPlatform";
import type { DocumentReviewItem } from "../../lib/documentReview";
import type { ProjectPackage, ProjectRecord } from "../../types/project";
import { ArrowLeft, Check, CircleAlert, Copy, FileText, Search, X } from "../ui/Icons";

interface DocumentViewerProps {
  project: ProjectRecord | null;
  projectPackage: ProjectPackage | null;
  onReturnToIntake: () => void;
}

export function DocumentViewer({ project, projectPackage, onReturnToIntake }: DocumentViewerProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  const reviewItems = useMemo(
    () => getDocumentReviewItems(projectPackage?.documents ?? [], project ?? undefined),
    [projectPackage, project]
  );
  const integrity = useMemo(() => validateExportPackage(project), [project]);
  const readiness = useMemo(
    () => project ? getClientReviewReadiness(project) : null,
    [project]
  );
  const generatedReadiness = useMemo(
    () => project ? evaluateGeneratedPackageReadiness(project) : null,
    [project]
  );
  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return reviewItems;
    return reviewItems.filter((document) =>
      document.fileName.toLowerCase().includes(normalizedQuery)
      || document.folder.toLowerCase().includes(normalizedQuery)
      || document.purpose.toLowerCase().includes(normalizedQuery)
    );
  }, [query, reviewItems]);
  const selected = selectedFile
    ? reviewItems.find((document) => document.fileName === selectedFile) ?? null
    : null;
  const checklistComplete = readiness?.checklist.filter((item) => item.passed).length ?? 0;
  const finalReady = Boolean(readiness?.isReady && generatedReadiness?.status === "Ready for Codex" && integrity.isValid);
  const finalBlockerCount = (readiness?.blockerCount ?? 0) + (generatedReadiness?.blockers.length ?? 0) + integrity.errors.length;
  const expectedCount = project ? expectedDocumentLocations(project).length : DOCUMENT_LOCATIONS.length;

  if (!projectPackage || !project) {
    return (
      <main className="page empty-page" id="main-content" tabIndex={-1}>
        <CircleEmpty />
        <h1>No active generated package</h1>
        <p>Generate a package from the active project to preview the documents.</p>
        <button className="button button-primary" onClick={onReturnToIntake}>Return to intake</button>
      </main>
    );
  }

  const copyDocument = async (document: DocumentReviewItem, actionLabel: string) => {
    try {
      const result = await copyText(document.content);
      setCopyStatus(result === "copied"
        ? `${actionLabel} copied.`
        : `${actionLabel} selected. Press Ctrl+C to copy.`);
    } catch (caughtError) {
      setCopyStatus(caughtError instanceof Error ? caughtError.message : "Copy failed.");
    }
  };

  return (
    <main className="page document-page" id="main-content" tabIndex={-1}>
      <div className="page-heading compact">
        <div>
          <h1>Project Package Preview</h1>
          <p>Review every generated document before copying instructions or exporting the ZIP package.</p>
        </div>
        <span className="document-count">{projectPackage.documents.length} generated documents</span>
      </div>

      <section className="package-review-summary" aria-labelledby="package-review-summary-title">
        <div className="section-heading">
          <div>
            <span>Package review</span>
            <h2 id="package-review-summary-title">Package summary</h2>
            <p>Readiness and export diagnostics for the active generated package.</p>
          </div>
        </div>
        <dl>
          <div><dt>Package status</dt><dd>{integrity.manifestSummary.readiness}</dd></div>
          <div><dt>Documents</dt><dd>{integrity.fileCount}/{integrity.expectedFileCount}</dd></div>
          <div><dt>Missing markers</dt><dd>{integrity.manifestSummary.missingMarkerCount}</dd></div>
          <div><dt>Client Review blockers</dt><dd>{readiness?.blockerCount ?? 0}</dd></div>
          <div><dt>Generated-content blockers</dt><dd>{generatedReadiness?.blockers.length ?? 0}</dd></div>
          <div><dt>Export-integrity blockers</dt><dd>{integrity.errors.length}</dd></div>
          <div><dt>Ready for Codex blockers</dt><dd>{finalBlockerCount}</dd></div>
          <div><dt>Readiness checklist</dt><dd>{checklistComplete}/{readiness?.checklist.length ?? 12}</dd></div>
          <div><dt>ZIP export</dt><dd>{integrity.isValid ? "Available" : "Unavailable"}</dd></div>
          <div><dt>Final readiness</dt><dd>{finalReady ? "Ready" : "Not ready"}</dd></div>
        </dl>
        {integrity.manifestSummary.missingMarkerCount > 0 ? (
          <div className="package-marker-warning" role="status">
            <CircleAlert size={19} aria-hidden="true" />
            <p>
              <strong>Missing information remains.</strong>
              Draft packages may contain `[MISSING: ...]` markers. Required missing information must be resolved before Ready for Codex.
            </p>
          </div>
        ) : (
          <div className="package-marker-warning is-clear" role="status">
            <Check size={19} aria-hidden="true" />
            <p><strong>No missing markers detected.</strong> Continue the document review and readiness checklist before implementation.</p>
          </div>
        )}
      </section>

      <section className="document-quick-copy" aria-labelledby="quick-copy-title">
        <div>
          <span>Key handoff files</span>
          <h2 id="quick-copy-title">Quick copy</h2>
          <p>Copy the most-used review and implementation documents without opening each preview.</p>
        </div>
        <div className="document-quick-actions">
          {QUICK_COPY_DOCUMENTS.map((fileName) => {
            const document = reviewItems.find((item) => item.fileName === fileName);
            return (
              <button
                className="button button-secondary"
                key={fileName}
                onClick={() => document && copyDocument(document, fileName)}
                disabled={!document}
                aria-label={`Quick copy ${fileName}`}
              >
                <Copy size={15} aria-hidden="true" />
                {fileName}
              </button>
            );
          })}
        </div>
        {copyStatus ? <p className="document-copy-status" aria-live="polite">{copyStatus}</p> : null}
      </section>

      {selected ? (
        <DocumentPreview
          document={selected}
          onBack={() => setSelectedFile(null)}
          onCopy={() => copyDocument(selected, selected.fileName)}
        />
      ) : (
        <section className="document-review-list" aria-labelledby="document-review-list-title">
          <div className="section-heading document-review-heading">
            <div>
              <h2 id="document-review-list-title">Generated document review</h2>
              <p>{filteredDocuments.length} of {expectedCount} documents shown.</p>
            </div>
            <label className="document-search">
              <span className="sr-only">Search documents</span>
              <Search size={17} aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a file, folder, or purpose" />
            </label>
          </div>

          {filteredDocuments.length > 0 ? (
            <div className="document-review-rows" role="list">
              {filteredDocuments.map((document) => (
                <article className="document-review-row" key={document.fileName} role="listitem">
                  <div className="document-review-name">
                    <FileText size={19} aria-hidden="true" />
                    <div>
                      <h3>{document.fileName}</h3>
                      <span>{document.folder || "Project root"}</span>
                    </div>
                  </div>
                  <p className="document-purpose">{document.purpose}</p>
                  <div className="document-review-state">
                    <span className={`document-status ${statusClassName(document.status)}`}>{document.status}</span>
                    <small>{document.missingMarkerCount} missing marker{document.missingMarkerCount === 1 ? "" : "s"}</small>
                  </div>
                  <div className="document-review-actions">
                    <button
                      className="button button-secondary"
                      onClick={() => setSelectedFile(document.fileName)}
                      aria-label={`Preview ${document.fileName}`}
                    >
                      Preview
                    </button>
                    <button
                      className="button button-secondary"
                      onClick={() => copyDocument(document, document.fileName)}
                      aria-label={`Copy ${document.fileName}`}
                    >
                      <Copy size={14} aria-hidden="true" />
                      Copy
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="document-empty">
              <h2>No matching documents</h2>
              <p>Clear or change the search to review the generated document list.</p>
              <button className="button button-secondary" onClick={() => setQuery("")}>Clear search</button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function DocumentPreview({
  document,
  onBack,
  onCopy
}: {
  document: DocumentReviewItem;
  onBack: () => void;
  onCopy: () => void;
}) {
  return (
    <section className="document-review-preview" aria-labelledby="document-preview-title">
      <header>
        <button className="button button-secondary" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back to document list
        </button>
        <button className="button button-primary" onClick={onCopy}>
          <Copy size={16} aria-hidden="true" />
          Copy document
        </button>
      </header>
      <div className="document-preview-meta">
        <div>
          <span>{document.folder || "Project root"}</span>
          <h2 id="document-preview-title">{document.fileName}</h2>
          <p>{document.purpose}</p>
        </div>
        <dl>
          <div><dt>Status</dt><dd>{document.status}</dd></div>
          <div><dt>Missing markers</dt><dd>{document.missingMarkerCount}</dd></div>
          <div><dt>Format</dt><dd>Markdown</dd></div>
        </dl>
      </div>
      <pre>{document.content}</pre>
      <button className="document-preview-close" onClick={onBack} aria-label="Close document preview">
        <X size={18} aria-hidden="true" />
      </button>
    </section>
  );
}

function statusClassName(status: DocumentReviewItem["status"]) {
  if (status === "Draft") return "needs-info";
  if (status === "Review Required") return "review-recommended";
  if (status === "Not Applicable") return "not-applicable";
  return "ready";
}

function CircleEmpty() {
  return <span className="empty-icon"><FileText size={28} aria-hidden="true" /></span>;
}
