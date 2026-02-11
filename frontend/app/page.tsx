import Link from "next/link";
import Container from "../components/Container";

const features = [
  {
    title: "Risk Calculator",
    href: "/risk-calculator",
    description: "Enter encounter features, get a calibrated readmission probability with the top drivers explained.",
  },
  {
    title: "Risk Surface",
    href: "/risk-surface",
    description: "Visualize how risk shifts across two clinical variables in an interactive 3-D surface.",
  },
  {
    title: "Cohort Analytics",
    href: "/analytics",
    description: "Review AUROC, calibration, and subgroup performance from the latest evaluation run.",
  },
  {
    title: "Fairness",
    href: "/fairness",
    description: "Audit equalized-odds and TPR / FPR gaps across race, gender, and age groups.",
  },
  {
    title: "Model Card",
    href: "/model-card",
    description: "Intended use, limitations, and safety guidance for this model.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero-banner">
        <Container>
          <div className="hero-inner fade-up">
            <p className="hero-eyebrow">Decision-support for research teams</p>
            <h1 className="hero-title">Discharge Compass</h1>
            <p className="hero-subtitle">
              Estimate 30-day readmission risk for diabetes inpatient encounters with explainable,
              fairness-audited predictions — built on the UCI Diabetes 130-US hospitals dataset.
            </p>
          </div>
        </Container>
      </section>

      <Container>
        <div className="notice disclaimer fade-up fade-delay-1">
          <strong>Not a clinical device.</strong> Predictions are probabilistic and may reflect
          historical bias. Always defer to clinical judgment and local policy.
        </div>

        <section className="features-grid fade-up fade-delay-2">
          {features.map((f) => (
            <Link key={f.href} href={f.href} className="feature-card">
              <h3>{f.title}</h3>
              <p>{f.description}</p>
              <span className="feature-arrow">&rarr;</span>
            </Link>
          ))}
        </section>
      </Container>
    </>
  );
}
