from __future__ import annotations

import os
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_DIR = Path(os.getenv("ARTIFACT_DIR", BACKEND_ROOT / "artifacts"))

MODEL_PATH = Path(os.getenv("MODEL_PATH", ARTIFACT_DIR / "model.joblib"))
BASE_MODEL_PATH = Path(os.getenv("BASE_MODEL_PATH", ARTIFACT_DIR / "base_model.joblib"))
REFERENCE_PATH = Path(os.getenv("REFERENCE_PATH", ARTIFACT_DIR / "feature_reference.json"))
METADATA_PATH = Path(os.getenv("METADATA_PATH", ARTIFACT_DIR / "model_metadata.json"))
FAIRNESS_PATH = Path(os.getenv("FAIRNESS_PATH", ARTIFACT_DIR / "fairness_report.json"))
METRICS_PATH = Path(os.getenv("METRICS_PATH", ARTIFACT_DIR / "eval_metrics.json"))
BACKGROUND_PATH = Path(os.getenv("BACKGROUND_PATH", ARTIFACT_DIR / "background_sample.csv"))
GLOBAL_IMPORTANCE_PATH = Path(os.getenv("GLOBAL_IMPORTANCE_PATH", ARTIFACT_DIR / "global_importance.json"))

LOW_RISK_THRESHOLD = float(os.getenv("LOW_RISK_THRESHOLD", "0.2"))
HIGH_RISK_THRESHOLD = float(os.getenv("HIGH_RISK_THRESHOLD", "0.5"))

CAUTION_MESSAGE = os.getenv(
    "CAUTION_MESSAGE",
    "This prediction is for research support only and may be biased; it must not be used for clinical decisions.",
)

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
    if origin.strip()
]

RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "false").lower() == "true"
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "120"))

AUTO_TRAIN = os.getenv("AUTO_TRAIN", "false").lower() == "true"
AUTO_TRAIN_DATA = os.getenv(
    "AUTO_TRAIN_DATA",
    str(BACKEND_ROOT.parents[0] / "data" / "raw" / "dataset_diabetes" / "diabetic_data.csv"),
)

API_KEY = os.getenv("API_KEY")

RISK_SURFACE_MAX_STEPS = int(os.getenv("RISK_SURFACE_MAX_STEPS", "50"))
RISK_SURFACE_CACHE_SIZE = int(os.getenv("RISK_SURFACE_CACHE_SIZE", "8"))
