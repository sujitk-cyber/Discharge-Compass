# Discharge Compass

Discharge Compass is an MVP web application + API for predicting 30-day hospital readmission risk for diabetes inpatient encounters using the UCI Diabetes 130-US hospitals dataset. It includes a calibrated ML pipeline, explainability, and fairness reporting.

## Repo layout
- `backend/` FastAPI + training pipeline
- `frontend/` Next.js UI
- `data/` synthetic demo data
- `scripts/` dataset download helper
- `docs/` model card

## Quickstart
1. **Setup (installs dependencies and trains a baseline model on synthetic data)**
```bash
make setup
```

2. **Train (uses synthetic data by default)**
```bash
make train
```

3. **Run (Docker)**
```bash
make run
```

4. **Open**
- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`

The cohort analytics page reads from `frontend/public/metrics.json` generated during `make train`.

Docker runs with `AUTO_TRAIN=true` so the API will bootstrap a model from `data/sample_synthetic.csv` if artifacts are missing.

## Tests
```bash
make test
```

## Using the real dataset
The repo ships with `data/sample_synthetic.csv` so the demo runs without the real dataset.

To download the UCI dataset:
```bash
python scripts/download_data.py --dest data/raw
```

Then train with the real data CSV:
```bash
.venv/bin/python -m backend.src.training.train --data data/raw/diabetic_data.csv --artifacts backend/artifacts
.venv/bin/python -m backend.src.training.evaluate --data data/raw/diabetic_data.csv --artifacts backend/artifacts --frontend-public frontend/public/metrics.json
```

If you already have a local CSV:
```bash
python scripts/download_data.py --dest data/raw --local /path/to/diabetic_data.csv
```

## API endpoints
- `POST /predict`
- `GET /model-metadata`
- `GET /fairness-report`
- `GET /metrics`
- `GET /health`
- `GET /risk-surface`

API docs are available at `http://localhost:8000/docs` (Swagger) and `http://localhost:8000/redoc`.

## Configuration
Set environment variables for local runs:
- `CORS_ORIGINS` (comma-separated)
- `LOW_RISK_THRESHOLD`, `HIGH_RISK_THRESHOLD`
- `RATE_LIMIT_ENABLED` (`true`/`false`), `RATE_LIMIT_PER_MINUTE`
- `API_KEY` (optional; requires `X-API-Key` or `Authorization: Bearer` header)
- `RISK_SURFACE_MAX_STEPS`, `RISK_SURFACE_CACHE_SIZE`

## Notes
- Model artifacts are written to `backend/artifacts/`.
- The model is for research and operational planning only, not clinical use.
