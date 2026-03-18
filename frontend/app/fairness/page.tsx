"use client";

import { useEffect, useState } from "react";
import Container from "../../components/Container";
import SectionHeader from "../../components/SectionHeader";
import { fetchJson } from "../../lib/api";

/* ── types ── */
interface GroupFairness {
  equalized_odds_difference: number;
  tpr_difference: number;
  fpr_difference: number;
  by_group: { tpr?: Record<string, number>; fpr?: Record<string, number> };
  group_counts?: Record<string, { n: number; n_positive: number }>;
  reliable_groups?: string[];
  overall?: { tpr: number; fpr: number };
  threshold_used?: number;
}

interface FairnessPayload {
  generated_at: string;
  metrics: Record<string, GroupFairness>;
}

interface SubgroupEntry {
  count: number;
  positive_rate: number;
  metrics: { auroc: number; auprc: number; brier: number; ece: number } | null;
}

interface MetricsPayload {
  generated_at: string;
  metrics: { primary: { auroc: number } };
  subgroup_performance: Record<string, Record<string, SubgroupEntry>>;
}

/* ── helpers ── */
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

const categoryLabels: Record<string, string> = {
  race: "Race / Ethnicity",
  gender: "Sex",
  age: "Age Group",
};

const categoryIcons: Record<string, string> = {
  race: "",
  gender: "",
  age: "",
};

const groupLabels: Record<string, string> = {
  "?": "Unknown",
  AfricanAmerican: "Black / African American",
  Caucasian: "White",
  Female: "Female",
  Male: "Male",
  Other: "Other",
};
const friendly = (g: string) => groupLabels[g] ?? g;

function verdictFor(eod: number): { label: string; color: string; explanation: string } {
  if (eod < 0.05)
    return { label: "Excellent", color: "var(--color-green)", explanation: "The model treats all subgroups almost identically — minimal disparity detected." };
  if (eod < 0.10)
    return { label: "Good", color: "var(--color-green)", explanation: "Minor differences exist but are within an acceptable range for clinical use." };
  if (eod < 0.20)
    return { label: "Moderate", color: "var(--color-orange)", explanation: "A noticeable gap exists in how well the model performs across subgroups. Worth monitoring over time." };
  if (eod < 0.40)
    return { label: "Notable gap", color: "var(--color-orange)", explanation: "A meaningful disparity exists. Some subgroups receive less accurate predictions. Consider supplementing with clinical judgment for affected groups." };
  return { label: "Significant gap", color: "var(--color-red)", explanation: "Large disparity detected — predictions for some subgroups are substantially less reliable." };
}

const contextNotes: Record<string, string> = {
  age: "Younger patients with diabetes-related readmissions tend to have more distinctive clinical patterns, making them easier for the model to detect. Elderly patients (90+) have more complex, overlapping conditions that are harder to distinguish.",
  gender: "The model performs similarly for male and female patients — no meaningful bias detected.",
  race: "Most groups are close. Smaller populations (Asian, Unknown) are excluded from the headline score due to having fewer than 10 readmission cases in the test set, which makes their rates statistically unreliable.",
};

function barWidth(v: number) {
  return `${Math.max(Math.min(v * 100 / 0.6, 100), 2)}%`;
}

/* ── main ── */
export default function FairnessPage() {
  const [fairness, setFairness] = useState<FairnessPayload | null>(null);
  const [perf, setPerf] = useState<MetricsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(["race", "gender", "age"]));

  const toggle = (cat: string) =>
    setOpenCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  useEffect(() => {
    fetchJson<FairnessPayload>("/fairness-report").then(setFairness).catch((e) => setError(e.message));
    fetchJson<MetricsPayload>("/metrics").then(setPerf).catch(() => {});
  }, []);

  if (error) {
    return (
      <Container>
        <SectionHeader title="Equity Analysis" subtitle="How fairly does the model perform across patient groups?" />
        <div className="notice">Unable to load fairness data. {error}</div>
      </Container>
    );
  }

  if (!fairness) {
    return (
      <Container>
        <SectionHeader title="Equity Analysis" subtitle="How fairly does the model perform across patient groups?" />
        <p style={{ color: "var(--color-ink-tertiary)" }}>Loading…</p>
      </Container>
    );
  }

  const categories = Object.entries(fairness.metrics);
  const totalPatients = perf
    ? Object.values(perf.subgroup_performance?.race ?? {}).reduce((s, g) => s + g.count, 0)
    : 0;

  return (
    <Container>
      <SectionHeader
        title="Equity Analysis"
        subtitle="Does the model perform equally well regardless of a patient's race, sex, or age? Here's what the data shows."
      />

      {/* explainer */}
      <div className="fairness-explainer">
        <p><strong>Why this matters:</strong> A prediction model is only useful if it works fairly for everyone. We measure two things for each patient group:</p>
        <ul>
          <li><strong>Detection rate (sensitivity)</strong> — Of patients who <em>were</em> readmitted, what % did the model correctly flag? Higher is better and should be similar across groups.</li>
          <li><strong>False alarm rate</strong> — Of patients who were <em>not</em> readmitted, what % did the model mistakenly flag? Lower is better and should be similar across groups.</li>
        </ul>
        <p style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "var(--color-ink-tertiary)" }}>
          Groups with fewer than 10 readmitted patients are shown but excluded from the headline gap score since their rates are statistically unreliable.
        </p>
      </div>

      {/* summary cards */}
      <div className="fairness-summary-row">
        {categories.map(([cat, m]) => {
          const v = verdictFor(m.equalized_odds_difference);
          return (
            <button
              key={cat}
              className={`fairness-summary-card ${openCats.has(cat) ? "active" : ""}`}
              onClick={() => toggle(cat)}
            >
              <span className="fairness-summary-label">{categoryLabels[cat] ?? cat}</span>
              <span className="fairness-summary-verdict" style={{ color: v.color }}>{v.label}</span>
              <span className="fairness-summary-value">Gap: {(m.equalized_odds_difference * 100).toFixed(1)}%</span>
            </button>
          );
        })}
      </div>

      {/* detail panels — all three shown */}
      {categories.map(([cat, m]) => {
        if (!openCats.has(cat)) return null;
        const v = verdictFor(m.equalized_odds_difference);
        const allGroups = Object.keys(m.by_group?.tpr || {});
        const reliable = new Set(m.reliable_groups ?? allGroups);
        const subPerf = perf?.subgroup_performance?.[cat];

        return (
          <div key={cat} className="fairness-detail">
            <div className="fairness-detail-header">
              <h3>{categoryLabels[cat] ?? cat}</h3>
              <span className="fairness-verdict-badge" style={{ background: v.color }}>{v.label}</span>
            </div>
            <p className="fairness-detail-explanation">{v.explanation}</p>

            {/* detection rate bars */}
            <div className="fairness-chart-section">
              <h4>Detection rate by group</h4>
              <p className="fairness-chart-sub">Of truly readmitted patients, what % did the model correctly identify?</p>
              <div className="fairness-bars">
                {allGroups.map((g) => {
                  const tpr = m.by_group?.tpr?.[g] ?? 0;
                  const isReliable = reliable.has(g);
                  const gc = m.group_counts?.[g];
                  const overallTpr = m.overall?.tpr ?? 0.3;
                  const isLow = isReliable && tpr < overallTpr * 0.7;
                  return (
                    <div key={g} className={`fairness-bar-row ${!isReliable ? "fairness-bar-unreliable" : ""}`}>
                      <span className="fairness-bar-label">
                        {friendly(g)}
                        {gc && <span className="fairness-bar-n">n={gc.n.toLocaleString()}</span>}
                      </span>
                      <div className="fairness-bar-track">
                        <div
                          className="fairness-bar-fill"
                          style={{
                            width: barWidth(tpr),
                            background: !isReliable
                              ? "rgba(255,255,255,0.1)"
                              : isLow
                              ? "var(--color-orange)"
                              : "var(--color-accent)",
                          }}
                        />
                      </div>
                      <span className="fairness-bar-value">{pct(tpr)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* false alarm rate bars */}
            <div className="fairness-chart-section">
              <h4>False alarm rate by group</h4>
              <p className="fairness-chart-sub">Of non-readmitted patients, what % were mistakenly flagged?</p>
              <div className="fairness-bars">
                {allGroups.map((g) => {
                  const fpr = m.by_group?.fpr?.[g] ?? 0;
                  const isReliable = reliable.has(g);
                  const gc = m.group_counts?.[g];
                  const overallFpr = m.overall?.fpr ?? 0.13;
                  const isHigh = isReliable && fpr > overallFpr * 1.3;
                  return (
                    <div key={g} className={`fairness-bar-row ${!isReliable ? "fairness-bar-unreliable" : ""}`}>
                      <span className="fairness-bar-label">
                        {friendly(g)}
                        {gc && <span className="fairness-bar-n">n={gc.n.toLocaleString()}</span>}
                      </span>
                      <div className="fairness-bar-track">
                        <div
                          className="fairness-bar-fill fairness-bar-fill--fpr"
                          style={{
                            width: barWidth(fpr),
                            background: !isReliable
                              ? "rgba(255,255,255,0.1)"
                              : isHigh
                              ? "var(--color-red)"
                              : "rgba(255,255,255,0.25)",
                          }}
                        />
                      </div>
                      <span className="fairness-bar-value">{pct(fpr)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* subgroup accuracy table */}
            {subPerf && (
              <div className="fairness-perf-section">
                <h4>Model accuracy breakdown</h4>
                <p className="fairness-chart-sub">How well the model separates readmitted vs. non-readmitted patients in each group</p>
                <div className="compare-table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Group</th>
                        <th>Patients</th>
                        <th>Readmit %</th>
                        <th>AUROC</th>
                        <th>Calibration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allGroups.map((g) => {
                        const sp = subPerf[g];
                        if (!sp) return null;
                        const isReliable = reliable.has(g);
                        return (
                          <tr key={g} style={{ opacity: isReliable ? 1 : 0.5 }}>
                            <td>{friendly(g)}</td>
                            <td>{sp.count.toLocaleString()}</td>
                            <td>{pct(sp.positive_rate)}</td>
                            <td style={{ color: sp.metrics && sp.metrics.auroc > 0.65 ? "var(--color-green)" : sp.metrics ? "var(--color-orange)" : "var(--color-ink-tertiary)" }}>
                              {sp.metrics ? sp.metrics.auroc.toFixed(3) : "—"}
                            </td>
                            <td>{sp.metrics ? (sp.metrics.ece < 0.03 ? "Good" : sp.metrics.ece < 0.05 ? "Fair" : "Poor") : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* context note */}
            <div className="fairness-callout">
              <strong>What does this mean?</strong>
              <p>{contextNotes[cat] ?? "The gap score measures the largest difference in detection or false alarm rate between any two reliable subgroups. 0 = perfect equality."}</p>
            </div>
          </div>
        );
      })}

      <p className="fairness-timestamp">
        Analysis generated {new Date(fairness.generated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        {totalPatients > 0 && <> · Based on held-out test set ({totalPatients.toLocaleString()} patients)</>}
      </p>
    </Container>
  );
}
