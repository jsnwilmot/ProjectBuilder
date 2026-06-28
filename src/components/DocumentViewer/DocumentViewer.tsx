import { useMemo, useState } from "react";
import type { ProjectPackage } from "../../types/project";
import { FileText, Search } from "../ui/Icons";

interface DocumentViewerProps {
  projectPackage: ProjectPackage | null;
  onReturnToIntake: () => void;
}

export function DocumentViewer({ projectPackage, onReturnToIntake }: DocumentViewerProps) {
  const [selectedFile, setSelectedFile] = useState("README.md");
  const [query, setQuery] = useState("");

  const filteredDocuments = useMemo(
    () => projectPackage?.documents.filter((document) =>
      document.fileName.toLowerCase().includes(query.toLowerCase())
    ) ?? [],
    [projectPackage, query]
  );
  const selected = filteredDocuments.find((document) => document.fileName === selectedFile)
    ?? filteredDocuments[0];

  if (!projectPackage) {
    return (
      <main className="page empty-page" id="main-content">
        <CircleEmpty />
        <h1>No active generated package</h1>
        <p>Generate a package from the active project to preview the documents.</p>
        <button className="button button-primary" onClick={onReturnToIntake}>Return to intake</button>
      </main>
    );
  }

  return (
    <main className="page document-page" id="main-content">
      <div className="page-heading compact">
        <div>
          <h1>Documentation Viewer</h1>
          <p>Review generated Markdown as plain text. Missing information remains explicit.</p>
        </div>
        <span className="document-count">{projectPackage.documents.length} generated documents</span>
      </div>

      <div className="document-workspace">
        <aside className="document-list" aria-label="Generated documents">
          <label className="document-search">
            <span className="sr-only">Search documents</span>
            <Search size={17} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a file" />
          </label>
          <div>
            {filteredDocuments.map((document) => (
              <button
                key={document.fileName}
                className={selected?.fileName === document.fileName ? "is-active" : ""}
                onClick={() => setSelectedFile(document.fileName)}
                aria-pressed={selected?.fileName === document.fileName}
              >
                <FileText size={17} aria-hidden="true" />
                <span>{document.fileName}</span>
                <small>{document.folder || "Project root"}</small>
              </button>
            ))}
          </div>
        </aside>
        <section className="document-preview" aria-live="polite">
          {selected ? (
            <>
              <header>
                <div>
                  <span>{selected.folder || projectPackage.rootFolder}</span>
                  <h2>{selected.fileName}</h2>
                </div>
                <span>Markdown</span>
              </header>
              <pre>{selected.content}</pre>
            </>
          ) : (
            <div className="document-empty">
              <h2>No matching documents</h2>
              <p>Clear or change the search to select a generated document.</p>
              {query ? <button className="button button-secondary" onClick={() => setQuery("")}>Clear search</button> : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function CircleEmpty() {
  return <span className="empty-icon"><FileText size={28} aria-hidden="true" /></span>;
}
