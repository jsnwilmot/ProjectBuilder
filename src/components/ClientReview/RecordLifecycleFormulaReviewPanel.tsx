import { useState } from "react";
import type {
  RecordLifecycleFormulaEvidenceTypeSummary,
  RecordLifecycleFormulaReviewSummary,
  RecordLifecycleFormulaReviewSummaryHistoryItem
} from "../../lib/recordLifecycleFormulaReviewSummary";

interface RecordLifecycleFormulaReviewPanelProps {
  summary: RecordLifecycleFormulaReviewSummary;
  idPrefix?: string;
}

const reviewStateDescriptions: Record<string, string> = {
  Blocked: "Formula review cannot proceed because required prerequisites or blockers remain.",
  "Review Required": "A lifecycle formula asset exists, but human review is still required."
};

const reviewReferenceDescriptions: Record<string, string> = {
  Current: "Current means the reference matches the current formula review contract. It does not mean approved.",
  Stale: "Stale means the reference no longer matches the current formula review contract.",
  Invalid: "Invalid means the reference data cannot be trusted as valid.",
  "Not Provided": "Not Provided means no review reference is available."
};

const evidenceStatusDescriptions: Record<string, string> = {
  Current: "Current evidence is bound to the current project, asset, and review contract. It does not mean approved.",
  Stale: "Stale evidence exists but no longer matches the current formula review contract.",
  Invalid: "Invalid evidence is malformed, unsafe, duplicated, or otherwise not trustworthy.",
  "Not Provided": "No source-free evidence has been recorded for this evidence type."
};

const technicalIdentityLabels: Record<string, string> = {
  assetId: "Asset ID",
  reviewContractVersion: "Review contract version",
  reviewContractChecksum: "Review contract checksum",
  formulaContentChecksum: "Formula content checksum",
  sourcePlanningAssetId: "Source planning asset ID",
  sourcePlanningAssetChecksum: "Source planning asset checksum",
  planningGenerationVersion: "Planning generation version",
  formulaGenerationVersion: "Formula generation version"
};

function safeIdPrefix(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "-") || "record-lifecycle-formula-review";
}

function statusClassName(status: string): string {
  return status.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function renderIssueList(title: string, issues: string[]) {
  if (issues.length === 0) return null;
  return (
    <div className="formula-review-issues">
      <h5>{title}</h5>
      <ul>
        {issues.map((issue) => <li key={issue}>{issue}</li>)}
      </ul>
    </div>
  );
}

function renderOutcomeList(label: string, outcomes: string[]) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{outcomes.length > 0 ? outcomes.join(", ") : "None"}</dd>
    </div>
  );
}

function EvidenceSection({
  title,
  summary,
  emptyText,
  boundaryText
}: {
  title: string;
  summary: RecordLifecycleFormulaEvidenceTypeSummary;
  emptyText: string;
  boundaryText: string;
}) {
  return (
    <section className="formula-review-evidence-section" aria-labelledby={`${statusClassName(title)}-heading`}>
      <div className="formula-review-subheading">
        <div>
          <h4 id={`${statusClassName(title)}-heading`}>{title}</h4>
          <p>{boundaryText}</p>
        </div>
        <span className={`formula-review-status status-${statusClassName(summary.status)}`}>{summary.status}</span>
      </div>

      <p className="formula-review-helper">{evidenceStatusDescriptions[summary.status]}</p>
      {summary.status === "Not Provided" ? <p className="formula-review-empty">{emptyText}</p> : null}

      <dl className="formula-review-counts" aria-label={`${title} counts`}>
        <div><dt>Records</dt><dd>{summary.recordCount}</dd></div>
        <div><dt>Current</dt><dd>{summary.currentCount}</dd></div>
        <div><dt>Stale</dt><dd>{summary.staleCount}</dd></div>
        <div><dt>Invalid</dt><dd>{summary.invalidCount}</dd></div>
        {renderOutcomeList("Current outcomes", summary.currentOutcomes)}
        {renderOutcomeList("Stale outcomes", summary.staleOutcomes)}
      </dl>
      {renderIssueList(`${title} issues`, summary.issues)}
    </section>
  );
}

function HistoryItem({ item }: { item: RecordLifecycleFormulaReviewSummaryHistoryItem }) {
  return (
    <li className={`formula-review-history-item status-${statusClassName(item.status)}`}>
      <dl>
        {item.evidenceType ? <div><dt>Evidence type</dt><dd>{item.evidenceType}</dd></div> : null}
        <div><dt>Status</dt><dd>{item.status}</dd></div>
        {item.outcome ? <div><dt>Outcome</dt><dd>{item.outcome}</dd></div> : null}
        {item.recordedAt ? <div><dt>Recorded timestamp</dt><dd>{item.recordedAt}</dd></div> : null}
        {item.evidenceId ? <div><dt>Evidence ID</dt><dd>{item.evidenceId}</dd></div> : null}
      </dl>
      {renderIssueList("Evidence issues", item.issues)}
    </li>
  );
}

export function RecordLifecycleFormulaReviewPanel({
  summary,
  idPrefix = "record-lifecycle-formula-review"
}: RecordLifecycleFormulaReviewPanelProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [technicalDetailsOpen, setTechnicalDetailsOpen] = useState(false);
  const idBase = safeIdPrefix(idPrefix);
  const headingId = `${idBase}-heading`;
  const historyId = `${idBase}-history`;
  const technicalDetailsId = `${idBase}-technical-details`;

  if (!summary.applicable) return null;

  const identityEntries = summary.formulaIdentity
    ? Object.entries(summary.formulaIdentity).filter(([, value]) => Boolean(value))
    : [];

  return (
    <section className="client-review-section formula-review-panel" aria-labelledby={headingId}>
      <div className="client-review-heading formula-review-heading">
        <div>
          <span>Internal review</span>
          <h3 id={headingId}>Lifecycle formula review</h3>
          <p>This is a read-only review summary. Current evidence does not mean the formula is approved.</p>
        </div>
      </div>

      <div className="formula-review-summary-grid" aria-label="Lifecycle formula review status summary">
        <div className="formula-review-status-card">
          <span>Formula review state</span>
          <strong>{summary.reviewState}</strong>
          <p>{reviewStateDescriptions[summary.reviewState]}</p>
        </div>
        <div className="formula-review-status-card">
          <span>Review reference</span>
          <strong>{summary.reviewReference.status}</strong>
          <p>{reviewReferenceDescriptions[summary.reviewReference.status]}</p>
        </div>
        <div className="formula-review-status-card">
          <span>Technical Review</span>
          <strong>{summary.technicalReview.status}</strong>
          <p>{evidenceStatusDescriptions[summary.technicalReview.status]}</p>
        </div>
        <div className="formula-review-status-card">
          <span>Studio Validation</span>
          <strong>{summary.studioValidation.status}</strong>
          <p>{evidenceStatusDescriptions[summary.studioValidation.status]}</p>
        </div>
      </div>

      {summary.formulaBlockers.length > 0 ? (
        <section className="formula-review-warning" aria-labelledby={`${idBase}-blockers-heading`}>
          <h4 id={`${idBase}-blockers-heading`}>Formula blockers</h4>
          <p>Evidence cannot dismiss blockers or change project readiness.</p>
          <ul>
            {summary.formulaBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        </section>
      ) : null}

      <section className="formula-review-reference" aria-labelledby={`${idBase}-reference-heading`}>
        <div className="formula-review-subheading">
          <div>
            <h4 id={`${idBase}-reference-heading`}>Review reference</h4>
            <p>{reviewReferenceDescriptions[summary.reviewReference.status]}</p>
          </div>
          <span className={`formula-review-status status-${statusClassName(summary.reviewReference.status)}`}>
            {summary.reviewReference.status}
          </span>
        </div>
        {renderIssueList("Review reference issues", summary.reviewReference.issues)}
      </section>

      <div className="formula-review-evidence-grid">
        <EvidenceSection
          title="Technical Review"
          summary={summary.technicalReview}
          emptyText="No Technical Review evidence has been recorded."
          boundaryText="Accepted is a Technical Review outcome. It does not mean Approved."
        />
        <EvidenceSection
          title="Power Apps Studio Validation"
          summary={summary.studioValidation}
          emptyText="No Power Apps Studio Validation evidence has been recorded."
          boundaryText="Passed is a Studio Validation outcome. It does not mean Approved."
        />
      </div>

      {summary.collectionIssues.length > 0 ? (
        <section className="formula-review-warning" aria-labelledby={`${idBase}-collection-heading`}>
          <h4 id={`${idBase}-collection-heading`}>Stored review data</h4>
          <p>Stored formula review data needs attention before it can be trusted.</p>
          <ul>
            {summary.collectionIssues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        </section>
      ) : null}

      {summary.history.length > 0 ? (
        <section className="formula-review-disclosure">
          <button
            className="button button-secondary"
            type="button"
            aria-expanded={historyOpen}
            aria-controls={historyId}
            onClick={() => setHistoryOpen((isOpen) => !isOpen)}
          >
            {historyOpen ? "Hide evidence history" : "Show evidence history"}
          </button>
          <div id={historyId} hidden={!historyOpen}>
            <ul className="formula-review-history-list">
              {summary.history.map((item, index) => (
                <HistoryItem key={`${item.evidenceId ?? "evidence"}-${index}`} item={item} />
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {identityEntries.length > 0 ? (
        <section className="formula-review-disclosure">
          <button
            className="button button-secondary"
            type="button"
            aria-expanded={technicalDetailsOpen}
            aria-controls={technicalDetailsId}
            onClick={() => setTechnicalDetailsOpen((isOpen) => !isOpen)}
          >
            {technicalDetailsOpen ? "Hide technical details" : "Show technical details"}
          </button>
          <div id={technicalDetailsId} hidden={!technicalDetailsOpen}>
            <dl className="formula-review-technical-details">
              {identityEntries.map(([key, value]) => (
                <div key={key}>
                  <dt>{technicalIdentityLabels[key] ?? key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}

      <section className="formula-review-safety" aria-labelledby={`${idBase}-safety-heading`}>
        <h4 id={`${idBase}-safety-heading`}>Safety notices</h4>
        <ul>
          {summary.safetyNotices.map((notice) => <li key={notice}>{notice}</li>)}
        </ul>
      </section>
    </section>
  );
}
