"use client";

import { useState } from "react";
import Container from "../../components/Container";
import SectionHeader from "../../components/SectionHeader";
import Card from "../../components/Card";
import { fetchJson } from "../../lib/api";

const friendlyNames: Record<string, string> = {
  race: "Race",
  gender: "Gender",
  age: "Age band",
  admission_type_id: "Admission type",
  discharge_disposition_id: "Discharge disposition",
  admission_source_id: "Admission source",
  time_in_hospital: "Time in hospital",
  num_lab_procedures: "Number of lab procedures",
  num_procedures: "Number of procedures",
  num_medications: "Number of medications",
  number_outpatient: "Prior outpatient visits",
  number_emergency: "Prior emergency visits",
  number_inpatient: "Prior inpatient stays",
  A1Cresult: "A1C test result",
  metformin: "Metformin status",
  insulin: "Insulin status",
  change: "Medication change",
  diabetesMed: "On diabetes medication",
};

function friendlyDirection(direction: string): string {
  if (direction === "increases_risk") return "pushes risk higher";
  if (direction === "decreases_risk") return "pushes risk lower";
  return "minimal effect";
}

function tierColor(tier: string): string {
  if (tier === "low") return "var(--color-green)";
  if (tier === "high") return "var(--color-red)";
  return "var(--color-orange)";
}

function tierExplanation(tier: string, probability: number): string {
  const pct = (probability * 100).toFixed(0);
  if (tier === "low") return `At ${pct}%, this encounter has a relatively low estimated readmission risk compared to the training population.`;
  if (tier === "high") return `At ${pct}%, this encounter shares characteristics with cases that were frequently readmitted within 30 days.`;
  return `At ${pct}%, this encounter falls in a moderate risk range — it may warrant a closer look at discharge.`;
}

const raceOptions: { value: string; label: string }[] = [
  { value: "Caucasian", label: "White" },
  { value: "AfricanAmerican", label: "Black / African American" },
  { value: "Asian", label: "Asian" },
  { value: "Hispanic", label: "Hispanic" },
  { value: "Other", label: "Other" },
  { value: "Unknown", label: "Unknown" },
];
const genderOptions = ["Male", "Female"];
const ageOptions: { value: string; label: string }[] = [
  { value: "[0-10)", label: "Under 10" },
  { value: "[10-20)", label: "10 – 19" },
  { value: "[20-30)", label: "20 – 29" },
  { value: "[30-40)", label: "30 – 39" },
  { value: "[40-50)", label: "40 – 49" },
  { value: "[50-60)", label: "50 – 59" },
  { value: "[60-70)", label: "60 – 69" },
  { value: "[70-80)", label: "70 – 79" },
  { value: "[80-90)", label: "80 – 89" },
  { value: "[90-100)", label: "90+" },
];
const a1cOptions: { value: string; label: string }[] = [
  { value: "None", label: "Not tested" },
  { value: "Norm", label: "Normal" },
  { value: ">7", label: "Above 7%" },
  { value: ">8", label: "Above 8%" },
];
const medStatusOptions: { value: string; label: string }[] = [
  { value: "No", label: "Not prescribed" },
  { value: "Steady", label: "Steady" },
  { value: "Up", label: "Dose increased" },
  { value: "Down", label: "Dose decreased" },
];
const changeOptions = ["No", "Ch"];
const diabetesMedOptions = ["Yes", "No"];

const initialForm = {
  race: "Caucasian",
  gender: "Female",
  age: "[60-70)",
  admission_type_id: 1,
  discharge_disposition_id: 1,
  admission_source_id: 7,
  time_in_hospital: 4,
  num_lab_procedures: 50,
  num_procedures: 2,
  num_medications: 14,
  number_outpatient: 0,
  number_emergency: 1,
  number_inpatient: 0,
  A1Cresult: ">7",
  metformin: "Steady",
  insulin: "Up",
  change: "Ch",
  diabetesMed: "Yes",
};

export default function RiskCalculatorPage() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchJson<any>("/predict", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setResult(payload);
    } catch (err: any) {
      setError(err.message || "Failed to fetch prediction.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <SectionHeader
        title="Risk Calculator"
        subtitle="Enter encounter features to generate a calibrated 30-day readmission risk estimate."
      />
      <Card>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="field">
            <label>Race</label>
            <select value={form.race} onChange={(e) => handleChange("race", e.target.value)}>
              {raceOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Gender</label>
            <select value={form.gender} onChange={(e) => handleChange("gender", e.target.value)}>
              {genderOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Age band</label>
            <select value={form.age} onChange={(e) => handleChange("age", e.target.value)}>
              {ageOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Admission type</label>
            <select value={form.admission_type_id} onChange={(e) => handleChange("admission_type_id", Number(e.target.value))}>
              <option value={1}>Emergency</option>
              <option value={2}>Urgent</option>
              <option value={3}>Elective</option>
              <option value={4}>Newborn</option>
              <option value={5}>Not available</option>
              <option value={6}>Trauma</option>
            </select>
          </div>
          <div className="field">
            <label>Discharge to</label>
            <select value={form.discharge_disposition_id} onChange={(e) => handleChange("discharge_disposition_id", Number(e.target.value))}>
              <option value={1}>Home</option>
              <option value={2}>Short-term hospital</option>
              <option value={3}>Skilled nursing facility</option>
              <option value={4}>Intermediate care facility</option>
              <option value={5}>Another type of facility</option>
              <option value={6}>Home with home health service</option>
              <option value={7}>Left AMA</option>
              <option value={8}>Home with IV provider</option>
            </select>
          </div>
          <div className="field">
            <label>Admission source</label>
            <select value={form.admission_source_id} onChange={(e) => handleChange("admission_source_id", Number(e.target.value))}>
              <option value={1}>Physician referral</option>
              <option value={2}>Clinic referral</option>
              <option value={3}>HMO referral</option>
              <option value={4}>Transfer from hospital</option>
              <option value={5}>Transfer from skilled nursing</option>
              <option value={6}>Transfer from another facility</option>
              <option value={7}>Emergency room</option>
              <option value={8}>Court/law enforcement</option>
            </select>
          </div>
          <div className="field">
            <label>Days in hospital</label>
            <input
              type="number"
              min={1}
              value={form.time_in_hospital}
              onChange={(e) => handleChange("time_in_hospital", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Lab procedures (#)</label>
            <input
              type="number"
              min={0}
              value={form.num_lab_procedures}
              onChange={(e) => handleChange("num_lab_procedures", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Procedures (#)</label>
            <input
              type="number"
              min={0}
              value={form.num_procedures}
              onChange={(e) => handleChange("num_procedures", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Medications (#)</label>
            <input
              type="number"
              min={0}
              value={form.num_medications}
              onChange={(e) => handleChange("num_medications", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Prior outpatient visits</label>
            <input
              type="number"
              min={0}
              value={form.number_outpatient}
              onChange={(e) => handleChange("number_outpatient", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Prior ER visits</label>
            <input
              type="number"
              min={0}
              value={form.number_emergency}
              onChange={(e) => handleChange("number_emergency", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Prior inpatient stays</label>
            <input
              type="number"
              min={0}
              value={form.number_inpatient}
              onChange={(e) => handleChange("number_inpatient", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>HbA1c result</label>
            <select value={form.A1Cresult} onChange={(e) => handleChange("A1Cresult", e.target.value)}>
              {a1cOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Metformin</label>
            <select value={form.metformin} onChange={(e) => handleChange("metformin", e.target.value)}>
              {medStatusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Insulin</label>
            <select value={form.insulin} onChange={(e) => handleChange("insulin", e.target.value)}>
              {medStatusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Meds changed this visit?</label>
            <select value={form.change} onChange={(e) => handleChange("change", e.target.value)}>
              <option value="No">No</option>
              <option value="Ch">Yes</option>
            </select>
          </div>
          <div className="field">
            <label>On diabetes meds?</label>
            <select value={form.diabetesMed} onChange={(e) => handleChange("diabetesMed", e.target.value)}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className="field" style={{ alignSelf: "end" }}>
            <button className="button" type="submit" disabled={loading}>
              {loading ? "Scoring..." : "Predict Risk"}
            </button>
          </div>
        </form>
      </Card>

      {error ? (
        <div className="notice" style={{ marginTop: "1.5rem" }}>
          {error} Run <code>make train</code> if the model artifact is missing.
        </div>
      ) : null}

      {result ? (
        <section style={{ marginTop: "1.5rem" }} className="fade-up fade-delay-1">
          {/* ── Main score ── */}
          <Card>
            <div className="risk-hero">
              <div className="risk-score" style={{ color: tierColor(result.risk_tier) }}>
                {(result.probability * 100).toFixed(0)}%
              </div>
              <div className="risk-tier" style={{ color: tierColor(result.risk_tier) }}>
                {result.risk_tier} risk
              </div>
            </div>
            <p className="risk-explanation">
              {tierExplanation(result.risk_tier, result.probability)}
            </p>
          </Card>

          {/* ── What's driving this score ── */}
          <div style={{ marginTop: "0.75rem" }}>
            <Card>
              <span className="result-label">What&apos;s driving this score</span>
              <div className="driver-list">
                {result.top_features
                  .filter((f: any) => f.direction !== "neutral")
                  .map((feature: any) => (
                  <div key={feature.feature} className="driver-row">
                    <span className="driver-dot" style={{
                      background: feature.direction === "increases_risk" ? "var(--color-red)" : "var(--color-green)"
                    }} />
                    <span className="driver-name">{friendlyNames[feature.feature] || feature.feature}</span>
                    <span className="driver-direction">{friendlyDirection(feature.direction)}</span>
                  </div>
                ))}
                {result.top_features.filter((f: any) => f.direction === "neutral").length > 0 && (
                  <p className="driver-neutral">
                    {result.top_features.filter((f: any) => f.direction === "neutral").map((f: any) => friendlyNames[f.feature] || f.feature).join(", ")}
                    {" "} had minimal effect on this particular score.
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* ── Keep in mind ── */}
          <div style={{ marginTop: "0.75rem" }}>
            <Card>
              <span className="result-label">Keep in mind</span>
              <ul className="result-list">
                <li>This score is based on structured encounter data only — it can&apos;t see clinical notes, social factors, or recent health changes.</li>
                <li>The model learned from hospital data collected between 1999 and 2008, which may not match current care patterns.</li>
                <li>Scores may be less reliable for uncommon patient profiles or rare clinical pathways.</li>
              </ul>
            </Card>
          </div>

          <p className="result-disclaimer">{result.caution}</p>
        </section>
      ) : null}
    </Container>
  );
}
