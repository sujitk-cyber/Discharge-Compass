# About This Tool

Discharge Compass estimates the chance a diabetic patient will be **readmitted within 30 days**. It returns a 0–100% risk score and shows which factors drove it.

## How it works

- Trained on ~100,000 encounters from the [UCI Diabetes dataset](https://archive.ics.uci.edu/dataset/296/diabetes+130-us+hospitals+for+years+1999-2008) (1999–2008).
- Uses a Gradient Boosting model with calibration so a 20% score means roughly 20 in 100 similar patients were readmitted.
- A simpler Logistic Regression runs in parallel as a baseline comparison.

## Risk tiers

| Tier | Score | What it means |
|------|-------|---------------|
| **Low** | < 20% | Readmission unlikely based on available data. |
| **Medium** | 20–50% | Moderate risk — may warrant closer review. |
| **High** | > 50% | Elevated risk — shares characteristics with frequently readmitted cases. |

## Limitations

- **Old data** — collected 1999–2008; care patterns have changed.
- **Structured fields only** — no clinical notes, social determinants, or patient preferences.
- **Not a diagnostic** — a high score doesn't mean readmission will happen.

## Safe use

1. Always pair with clinical judgment.
2. Validate on your own patient population before acting on results.
3. Review the Equity Analysis page for fairness across demographics.
4. Do not use for individual discharge decisions without institutional approval.
