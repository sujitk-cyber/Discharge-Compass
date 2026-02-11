# Discharge Compass Model Card

## Intended Use
- Support exploratory analysis and workflow planning for 30-day readmission risk in diabetes inpatient encounters.
- Provide probability estimates and explanations to help teams understand risk drivers.
- Not intended for direct clinical decision-making or patient-specific treatment decisions.

## Model Overview
- Primary model: Gradient Boosting Classifier with isotonic calibration.
- Baseline model: Logistic Regression.
- Target: 30-day readmission (`readmitted == "<30"`).

## Data Description
- Dataset: UCI Diabetes 130-US hospitals (1999-2008).
- Population: Hospitalized patients with diabetes-related encounters.
- Features: Demographics, encounter details, labs, and medication indicators.

## Evaluation
- Metrics: AUROC, AUPRC, Brier score, Expected Calibration Error, confusion matrix at key operating points.
- Deterministic train/validation/test split.
- Metrics are generated in `backend/artifacts/eval_metrics.json`.

## Fairness Checks
- Equalized odds difference and TPR/FPR gaps by race, gender, and age band.
- Report is generated in `backend/artifacts/fairness_report.json`.

## Explainability
- Local explanations use SHAP when available, otherwise feature ablation based on reference values.
- Global permutation importance is computed during evaluation.

## Limitations
- Historical bias in dataset may propagate into predictions.
- Predictions are probabilistic and may be poorly calibrated on out-of-distribution populations.
- Limited to available features; missing clinical context can change risk substantially.

## Safety Notes
- Do not use for triage, discharge decisions, or direct care decisions.
- Use in conjunction with clinical governance and local validation.
