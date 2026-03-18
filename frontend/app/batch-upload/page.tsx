"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Container from "../../components/Container";
import SectionHeader from "../../components/SectionHeader";
import Card from "../../components/Card";
import { API_BASE } from "../../lib/api";
import { authHeaders, getToken, getUser, isLoggedIn } from "../../lib/auth";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

interface RowResult {
  row: number;
  probability: number;
  risk_tier: string;
  risk_pct: string;
}

interface BatchResponse {
  results: RowResult[];
  summary: { total: number; high: number; medium: number; low: number; avg_risk: number };
  upload_id?: number | null;
}

interface UploadRecord {
  id: number;
  filename: string;
  row_count: number;
  summary: { total: number; high: number; medium: number; low: number; avg_risk: number };
  created_at: string;
}

const TEMPLATE_COLUMNS = [
  "race", "gender", "age", "admission_type_id", "discharge_disposition_id",
  "admission_source_id", "time_in_hospital", "num_lab_procedures",
  "num_procedures", "num_medications", "number_outpatient",
  "number_emergency", "number_inpatient", "A1Cresult", "metformin",
  "insulin", "change", "diabetesMed",
];

const SAMPLE_ROW = [
  "Caucasian", "Female", "[60-70)", "1", "1", "7", "4", "50", "2", "14",
  "0", "1", "0", ">7", "Steady", "Up", "Ch", "Yes",
];

function tierColor(tier: string) {
  if (tier === "high") return "var(--color-red)";
  if (tier === "medium") return "var(--color-orange)";
  return "var(--color-green)";
}

function downloadTemplate() {
  const header = TEMPLATE_COLUMNS.join(",");
  const row = SAMPLE_ROW.join(",");
  const csv = `${header}\n${row}\n`;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "discharge_compass_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadResults(results: RowResult[]) {
  const header = "row,probability,risk_tier,risk_pct";
  const rows = results.map((r) => `${r.row},${r.probability},${r.risk_tier},${r.risk_pct}`);
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "discharge_compass_results.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function BatchUploadPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BatchResponse | null>(null);
  const [sortCol, setSortCol] = useState<"row" | "probability">("row");
  const [sortAsc, setSortAsc] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // auth state
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  // history
  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [expandedUpload, setExpandedUpload] = useState<number | null>(null);
  const [expandedResults, setExpandedResults] = useState<RowResult[] | null>(null);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    const u = getUser();
    if (u) setUserName(u.name);
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!isLoggedIn()) return;
    try {
      const res = await fetch(`${API_BASE}/uploads`, { headers: { ...authHeaders() } });
      if (res.ok) setHistory(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setError(null);
    setData(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const headers: Record<string, string> = {
        ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
        ...authHeaders(),
      };
      const res = await fetch(`${API_BASE}/predict-batch`, { method: "POST", body: form, headers });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail || "Upload failed");
      }
      const json: BatchResponse = await res.json();
      setData(json);
      fetchHistory(); // refresh history
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUploadDetail = async (id: number) => {
    if (expandedUpload === id) {
      setExpandedUpload(null);
      setExpandedResults(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/uploads/${id}`, { headers: { ...authHeaders() } });
      if (res.ok) {
        const d = await res.json();
        setExpandedUpload(id);
        setExpandedResults(d.results);
      }
    } catch {}
  };

  const sorted = data
    ? [...data.results].sort((a, b) => {
        const v = sortCol === "row" ? a.row - b.row : a.probability - b.probability;
        return sortAsc ? v : -v;
      })
    : [];

  const toggleSort = (col: "row" | "probability") => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(col === "row"); }
  };

  return (
    <Container>
      <SectionHeader
        title="Batch Upload"
        subtitle="Upload a CSV or Excel file with patient encounters to get risk scores for every row."
      />

      {/* sign-in prompt */}
      {!loggedIn && (
        <div className="batch-auth-prompt">
          <Link href="/login">Sign in</Link> to save your uploads and view past results.
        </div>
      )}

      {/* instructions */}
      <div className="batch-instructions">
        <p>Your file must contain these columns (exact names):</p>
        <div className="batch-cols-preview">
          {TEMPLATE_COLUMNS.map((c) => (
            <code key={c}>{c}</code>
          ))}
        </div>
        <button className="batch-template-btn" onClick={downloadTemplate}>
          Download CSV template
        </button>
      </div>

      {/* drop zone */}
      <div
        className={`batch-dropzone ${dragging ? "batch-dropzone--active" : ""} ${file ? "batch-dropzone--has-file" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {file ? (
          <p className="batch-dropzone-text">{file.name} <span>({(file.size / 1024).toFixed(0)} KB)</span></p>
        ) : (
          <p className="batch-dropzone-text">Drag and drop a .csv or .xlsx file here, or click to browse</p>
        )}
      </div>

      <div className="batch-actions">
        <button className="button" onClick={submit} disabled={!file || loading}>
          {loading ? "Scoring..." : "Score patients"}
        </button>
        {file && !loading && (
          <button className="batch-clear-btn" onClick={() => { setFile(null); setData(null); setError(null); }}>
            Clear
          </button>
        )}
      </div>

      {error && <div className="notice" style={{ marginTop: "1rem" }}>{error}</div>}

      {/* results */}
      {data && (
        <section className="batch-results fade-up">
          <div className="batch-summary-row">
            <Card>
              <span className="batch-stat-label">Total patients</span>
              <span className="batch-stat-value">{data.summary.total}</span>
            </Card>
            <Card>
              <span className="batch-stat-label">Avg risk</span>
              <span className="batch-stat-value">{data.summary.avg_risk}%</span>
            </Card>
            <Card>
              <span className="batch-stat-label" style={{ color: "var(--color-red)" }}>High risk</span>
              <span className="batch-stat-value">{data.summary.high}</span>
            </Card>
            <Card>
              <span className="batch-stat-label" style={{ color: "var(--color-orange)" }}>Medium risk</span>
              <span className="batch-stat-value">{data.summary.medium}</span>
            </Card>
            <Card>
              <span className="batch-stat-label" style={{ color: "var(--color-green)" }}>Low risk</span>
              <span className="batch-stat-value">{data.summary.low}</span>
            </Card>
          </div>

          <div className="batch-table-header">
            <h3>Results</h3>
            <button className="batch-template-btn" onClick={() => downloadResults(data.results)}>
              Export CSV
            </button>
          </div>
          <div className="compare-table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="batch-sortable" onClick={() => toggleSort("row")}>
                    Row {sortCol === "row" ? (sortAsc ? "↑" : "↓") : ""}
                  </th>
                  <th className="batch-sortable" onClick={() => toggleSort("probability")}>
                    Risk score {sortCol === "probability" ? (sortAsc ? "↑" : "↓") : ""}
                  </th>
                  <th>Tier</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>
                      <div className="batch-score-cell">
                        <div className="batch-score-bar" style={{ width: `${r.probability * 100}%`, background: tierColor(r.risk_tier) }} />
                        <span>{r.risk_pct}</span>
                      </div>
                    </td>
                    <td>
                      <span className="batch-tier-badge" style={{ color: tierColor(r.risk_tier) }}>
                        {r.risk_tier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* upload history */}
      {loggedIn && history.length > 0 && (
        <section className="batch-history">
          <h3 className="batch-history-title">Your past uploads</h3>
          <div className="batch-history-list">
            {history.map((h) => (
              <div key={h.id} className="batch-history-item">
                <button className="batch-history-row" onClick={() => loadUploadDetail(h.id)}>
                  <span className="batch-history-name">{h.filename}</span>
                  <span className="batch-history-meta">
                    {h.row_count} patients · Avg {h.summary.avg_risk}% · {h.summary.high} high risk
                  </span>
                  <span className="batch-history-date">
                    {new Date(h.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="batch-history-chevron">{expandedUpload === h.id ? "−" : "+"}</span>
                </button>
                {expandedUpload === h.id && expandedResults && (
                  <div className="batch-history-detail">
                    <div className="batch-table-header">
                      <span>Results</span>
                      <button className="batch-template-btn" onClick={() => downloadResults(expandedResults)}>Export CSV</button>
                    </div>
                    <div className="compare-table-wrap">
                      <table className="table">
                        <thead>
                          <tr><th>Row</th><th>Risk score</th><th>Tier</th></tr>
                        </thead>
                        <tbody>
                          {expandedResults.map((r) => (
                            <tr key={r.row}>
                              <td>{r.row}</td>
                              <td>
                                <div className="batch-score-cell">
                                  <div className="batch-score-bar" style={{ width: `${r.probability * 100}%`, background: tierColor(r.risk_tier) }} />
                                  <span>{r.risk_pct}</span>
                                </div>
                              </td>
                              <td><span className="batch-tier-badge" style={{ color: tierColor(r.risk_tier) }}>{r.risk_tier}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
