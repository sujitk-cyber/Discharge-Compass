"use client";

import Container from "../../components/Container";
import SectionHeader from "../../components/SectionHeader";

const tiers = [
  { tier: "Low", range: "Below 20%", color: "var(--color-green)", desc: "Readmission unlikely based on available data." },
  { tier: "Medium", range: "20 – 50%", color: "var(--color-orange)", desc: "Moderate risk — may warrant closer review." },
  { tier: "High", range: "Above 50%", color: "var(--color-red)", desc: "Elevated risk — shares traits with frequently readmitted cases." },
];

export default function ModelCardPage() {
  return (
    <Container>
      <SectionHeader title="Model Card" subtitle="What this tool does, how it works, and what to watch out for." />

      <div className="mc-grid">
        {/* left column */}
        <div className="mc-section">
          <h3 className="mc-heading">What it does</h3>
          <p className="mc-text">
            Estimates the chance a diabetic patient will be <strong>readmitted within 30 days</strong>.
            Returns a 0–100% risk score and highlights which factors drove it.
          </p>
        </div>

        <div className="mc-section">
          <h3 className="mc-heading">How it works</h3>
          <ul className="mc-list">
            <li>Trained on ~100k encounters from the UCI Diabetes dataset (1999–2008).</li>
            <li>Gradient Boosting model with calibration — a 20% score means roughly 20 in 100 similar patients were readmitted.</li>
            <li>A Logistic Regression baseline runs in parallel for comparison.</li>
          </ul>
        </div>

        <div className="mc-section">
          <h3 className="mc-heading">Risk tiers</h3>
          <div className="mc-tiers">
            {tiers.map((t) => (
              <div key={t.tier} className="mc-tier-row">
                <span className="mc-tier-dot" style={{ background: t.color }} />
                <div>
                  <span className="mc-tier-label">{t.tier}</span>
                  <span className="mc-tier-range">{t.range}</span>
                  <p className="mc-tier-desc">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mc-section">
          <h3 className="mc-heading">Limitations</h3>
          <ul className="mc-list">
            <li><strong>Old data</strong> — collected 1999–2008; care patterns have changed.</li>
            <li><strong>Structured fields only</strong> — no clinical notes, social determinants, or patient preferences.</li>
            <li><strong>Not a diagnostic</strong> — a high score does not mean readmission will happen.</li>
          </ul>
        </div>

        <div className="mc-section">
          <h3 className="mc-heading">Safe use</h3>
          <ol className="mc-list mc-list--numbered">
            <li>Always pair with clinical judgment.</li>
            <li>Validate on your own patient population before acting on results.</li>
            <li>Review the Equity Analysis page for demographic fairness.</li>
            <li>Do not use for discharge decisions without institutional approval.</li>
          </ol>
        </div>
      </div>
    </Container>
  );
}
