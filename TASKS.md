# Discharge Compass - Task List

## 0) Repo scaffolding
- [ ] Create monorepo root `discharge-compass` with `backend/`, `frontend/`, `data/`, `scripts/`, `docs/`
- [ ] Add root `README.md`, `Makefile`, `.gitignore`, `docker-compose.yml`

## 1) Data & artifacts
- [ ] Add `scripts/download_data.py` to fetch UCI Diabetes dataset (no dataset committed)
- [ ] Add `data/sample_synthetic.csv` (~200 rows) matching schema for demo
- [ ] Define `backend/artifacts/` for model + evaluation artifacts

## 2) ML pipeline
- [ ] Implement `backend/src/training/train.py` (deterministic split, baseline LR, primary GBM)
- [ ] Implement calibration step and save calibrated primary model with `joblib`
- [ ] Implement `backend/src/training/evaluate.py` producing JSON metrics (AUROC, AUPRC, calibration, subgroup)
- [ ] Implement fairness metrics with `fairlearn` (equalized odds diff, FPR/TPR diffs by group)
- [ ] Implement explainability: SHAP if available; fallback to permutation + local approximation
- [ ] Save `model_metadata.json` and `fairness_report.json` in `backend/artifacts/`

## 3) Backend API (FastAPI)
- [ ] Create `backend/src/main.py` and router
- [ ] Pydantic models for request/response + validation layer
- [ ] POST `/predict`: probability, risk tier, top 5 features, caution message
- [ ] GET `/model-metadata`: model version, training date, feature list
- [ ] GET `/fairness-report`: return precomputed metrics
- [ ] Unit tests: `/predict` and validation

## 4) Frontend (Next.js, TypeScript)
- [ ] Initialize Next.js app with clean component structure
- [ ] Build pages:
  - [ ] Home (what it does + disclaimer)
  - [ ] Risk Calculator (form -> /predict)
  - [ ] Cohort Analytics (read metrics JSON)
  - [ ] Fairness (call /fairness-report)
  - [ ] Model Card (render markdown)
- [ ] Responsive layout + reusable components

## 5) Docs & model card
- [ ] Create `docs/model_card.md` (intended use, limitations, data, eval, fairness, safety)
- [ ] Wire frontend to render model card

## 6) Docker & Dev UX
- [ ] Dockerfile for backend
- [ ] Dockerfile for frontend
- [ ] Root `docker-compose.yml` to run both
- [ ] Root `Makefile` targets: `setup`, `train`, `run`, `test`

## 7) Final polish
- [ ] Update `README.md` with setup + demo steps
- [ ] Verify `make setup`, `make train`, `make run`
