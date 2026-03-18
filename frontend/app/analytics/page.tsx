"use client";

import { useEffect, useState } from "react";
import Container from "../../components/Container";
import SectionHeader from "../../components/SectionHeader";
import Card from "../../components/Card";
import { fetchJson } from "../../lib/api";

interface MetricsPayload {
  generated_at: string;
  metrics: Record<string, Record<string, number>>;
  operating_points?: Record<string, any>;
  calibration_curve?: Array<{
    bin_start: number;
    bin_end: number;
    mean_pred: number;
    mean_true: number;
    count: number;
  }>;
  subgroup_performance?: Record<
    string,
    Record<string, { count: number; positive_rate: number; metrics: Record<string, number> | null }>
  >;
}

/* ── Helpers ─────────────────────────────────────────── */
function pct(v: number) { return (v * 100).toFixed(1) + "%"; }
function dec(v: number, d = 3) { return v.toFixed(d); }

function qualityLabel(auroc: number): { label: string; color: string } {
  if (auroc >= 0.8) return { label: "Good", color: "var(--color-green)" };
  if (auroc >= 0.65) return { label: "Fair", color: "var(--color-orange)" };
  return { label: "Weak", color: "var(--color-red)" };
}

function calibrationLabel(ece: number): string {
  if (ece <= 0.05) return "well-calibrated — predicted probabilities closely match observed rates";
  if (ece <= 0.15) return "moderately calibrated — some drift between predicted and observed rates";
  return "poorly calibrated — predicted scores do not reliably match observed rates";
}

const friendlyGroupNames: Record<string, string> = {
  race: "Race / Ethnicity",
  gender: "Gender",
  age: "Age Band",
};

/* ── Expandable section ──────────────────────────────── */
function Section({ title, subtitle, defaultOpen = false, children }: {
  title: string; subtitle: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="analytics-section">
      <button className="section-toggle" onClick={() => setOpen(!open)} type="button">
        <div>
          <h3 className="section-toggle-title">{title}</h3>
          <p className="section-toggle-sub">{subtitle}</p>
        </div>
        <span className={`section-chevron ${open ? "open" : ""}`}>▾</span>
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

/* ── Stat card ───────────────────────────────────────── */
function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={color ? { color } : undefined}>{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [data, setData] = useState<MetricsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setData(await fetchJson<MetricsPayload>("/metrics"));
      } catch {
        try {
          const res = await fetch("/metrics.json");
          if (!res.ok) throw new Error(res.statusText);
          setData(await res.json());
        } catch (e: any) { setError(e.message); }
      }
    })();
  }, []);

  if (error) return (
    <Container>
      <SectionHeader title="Analytics" subtitle="Model performance at a glance." />
      <div className="notice">Unable to load metrics. {error} Run <code>make train</code> to generate evaluation artifacts.</div>
    </Container>
  );

  if (!data) return (
    <Container>
      <SectionHeader title="Analytics" subtitle="Model performance at a glance." />
      <p style={{ color: "var(--color-ink-tertiary)" }}>Loading...</p>
    </Container>
  );

  const primary = data.metrics.primary;
  const baseline = data.metrics.baseline;
  const q = qualityLabel(primary?.auroc ?? 0);
  const bestOp = data.operating_points?.top_15_percent;

  return (
    <Container>
      <SectionHeader
        title="Analytics"
        subtitle="How well does the model perform? Explore accuracy, calibration, and subgroup breakdowns."
      />

      {/* ── Headline stats ── */}
      <div className="stat-grid">
        <Stat
          label="Discrimination (AUROC)"
          value={dec(primary.auroc)}
          sub={`${q.label} — how well the model separates patients who will be readmitted from those who won't`}
          color={q.color}
        />
        <Stat
          label="Calibration error (ECE)"
          value={dec(primary.ece)}
          sub={`Model is ${calibrationLabel(primary.ece)}`}
        />
        <Stat
          label="Precision–recall (AUPRC)"
          value={dec(primary.auprc)}
          sub="Area under the precision-recall curve — important when readmissions are rare"
        />
        <Stat
          label="Brier score"
          value={dec(primary.brier)}
          sub="Overall accuracy of probability estimates (lower is better, 0 is perfect)"
        />
      </div>

      {/* ── Primary vs Baseline ── */}
      <Section title="Primary vs. baseline model" subtitle="Is the main model actually better than a simple one?" defaultOpen>
        <p className="section-prose">
          The <strong>primary model</strong> (Gradient Boosting) is compared against a <strong>baseline</strong> (Logistic Regression).
          If the baseline scores higher on some metrics, it may indicate the primary model is overfitting on this small dataset.
        </p>
        <div className="compare-table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Primary</th>
                <th>Baseline</th>
                <th>What it means</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>AUROC</td>
                <td>{dec(primary.auroc)}</td>
                <td>{dec(baseline.auroc)}</td>
                <td className="table-explain">Ability to rank high-risk patients above low-risk (1.0 = perfect)</td>
              </tr>
              <tr>
                <td>AUPRC</td>
                <td>{dec(primary.auprc)}</td>
                <td>{dec(baseline.auprc)}</td>
                <td className="table-explain">Precision at various recall levels — crucial for imbalanced data</td>
              </tr>
              <tr>
                <td>Brier</td>
                <td>{dec(primary.brier)}</td>
                <td>{dec(baseline.brier)}</td>
                <td className="table-explain">Mean squared error of probabilities (lower = better)</td>
              </tr>
              <tr>
                <td>ECE</td>
                <td>{dec(primary.ece)}</td>
                <td>{dec(baseline.ece)}</td>
                <td className="table-explain">Gap between predicted and observed rates (lower = better calibrated)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Operating points ── */}
      {bestOp && (
        <Section title="What happens when we act on the score?" subtitle="If we flagged the riskiest patients, how often would we be right?">
          <p className="section-prose">
            At the <strong>top-15% threshold</strong> (score ≥ {dec(bestOp.threshold)}), the model flags
            {" "}<strong>{bestOp.tp + bestOp.fp}</strong> patients. Of those, <strong>{bestOp.tp}</strong> were
            actually readmitted (precision: {pct(bestOp.precision)}) and it catches {pct(bestOp.recall)} of
            all readmissions.
          </p>
          <div className="stat-grid" style={{ marginTop: "1rem" }}>
            <Stat label="Flagged" value={String(bestOp.tp + bestOp.fp)} sub="patients at this threshold" />
            <Stat label="True catches" value={String(bestOp.tp)} sub="were actually readmitted" color="var(--color-green)" />
            <Stat label="False alarms" value={String(bestOp.fp)} sub="were not readmitted" color="var(--color-orange)" />
            <Stat label="Missed" value={String(bestOp.fn)} sub="readmitted but not flagged" color="var(--color-red)" />
          </div>
        </Section>
      )}

      {/* ── Calibration ── */}
      {data.calibration_curve && data.calibration_curve.length > 0 && (
        <Section title="Are the probabilities trustworthy?" subtitle="Calibration — when the model says 20%, is it really ~20%?">
          <p className="section-prose">
            Each row groups patients by their predicted score range. If calibrated well, the
            &ldquo;Actual rate&rdquo; column should be close to the &ldquo;Average prediction&rdquo; column.
          </p>
          <div className="compare-table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Score range</th>
                  <th>Avg prediction</th>
                  <th>Actual rate</th>
                  <th>Patients</th>
                  <th>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {data.calibration_curve.map((row) => {
                  const gap = Math.abs(row.mean_pred - row.mean_true);
                  const verdict = gap < 0.05 ? "✓ Good" : gap < 0.15 ? "~ Okay" : "✗ Off";
                  const color = gap < 0.05 ? "var(--color-green)" : gap < 0.15 ? "var(--color-orange)" : "var(--color-red)";
                  return (
                    <tr key={`${row.bin_start}-${row.bin_end}`}>
                      <td>{pct(row.bin_start)} – {pct(row.bin_end)}</td>
                      <td>{pct(row.mean_pred)}</td>
                      <td>{pct(row.mean_true)}</td>
                      <td>{row.count}</td>
                      <td style={{ color, fontWeight: 600 }}>{verdict}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ── Subgroup performance ── */}
      {data.subgroup_performance && (
        <Section title="Does the model work equally for all groups?" subtitle="Performance broken down by race, gender, and age.">
          <p className="section-prose">
            Groups with fewer than 5 patients or no readmissions can&apos;t be reliably evaluated and show &ldquo;n/a&rdquo;.
            Look for large differences in AUROC between groups — that may signal bias.
          </p>
          {Object.entries(data.subgroup_performance).map(([groupName, groups]) => (
            <div key={groupName} style={{ marginTop: "1.25rem" }}>
              <h4 className="subgroup-heading">{friendlyGroupNames[groupName] || groupName}</h4>
              <div className="compare-table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Group</th>
                      <th>Patients</th>
                      <th>Readmission rate</th>
                      <th>AUROC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groups).map(([label, detail]) => (
                      <tr key={label}>
                        <td>{label}</td>
                        <td>{detail.count}</td>
                        <td>{pct(detail.positive_rate)}</td>
                        <td>{detail.metrics?.auroc != null ? dec(detail.metrics.auroc) : <span style={{ color: "var(--color-ink-tertiary)" }}>n/a</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </Section>
      )}

      <p className="analytics-timestamp">
        Last evaluated {new Date(data.generated_at).toLocaleString()}
      </p>
    </Container>
  );
}
