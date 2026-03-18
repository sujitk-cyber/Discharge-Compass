from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Dict, List

import joblib
import pandas as pd

from .config import (
    ARTIFACT_DIR,
    BASE_MODEL_PATH,
    CAUTION_MESSAGE,
    FAIRNESS_PATH,
    HIGH_RISK_THRESHOLD,
    LOW_RISK_THRESHOLD,
    METADATA_PATH,
    METRICS_PATH,
    MODEL_PATH,
    REFERENCE_PATH,
)
from .explain import ablation_contributions, shap_local_contributions


@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model artifact not found at {MODEL_PATH}")
    return joblib.load(MODEL_PATH)


@lru_cache(maxsize=1)
def load_base_model():
    if BASE_MODEL_PATH.exists():
        return joblib.load(BASE_MODEL_PATH)
    return None


@lru_cache(maxsize=1)
def load_reference() -> Dict[str, object]:
    if REFERENCE_PATH.exists():
        with REFERENCE_PATH.open() as handle:
            return json.load(handle)
    return {}


def load_json(path: Path) -> Dict:
    if not path.exists():
        raise FileNotFoundError(f"Artifact not found at {path}")
    with path.open() as handle:
        return json.load(handle)


def risk_tier(probability: float) -> str:
    if probability < LOW_RISK_THRESHOLD:
        return "low"
    if probability < HIGH_RISK_THRESHOLD:
        return "medium"
    return "high"


def predict(payload: Dict) -> Dict:
    model = load_model()
    base_model = load_base_model()
    reference = load_reference()

    X = pd.DataFrame([payload])
    probability = float(model.predict_proba(X)[0, 1])

    contributions = None
    if base_model is not None:
        contributions = shap_local_contributions(base_model, X)

    if contributions is None:
        _, contributions = ablation_contributions(model, X, reference)

    sorted_features = sorted(contributions.items(), key=lambda item: abs(item[1]), reverse=True)[:5]
    top_features: List[Dict] = []
    for feature, contribution in sorted_features:
        if contribution > 0:
            direction = "increases_risk"
        elif contribution < 0:
            direction = "decreases_risk"
        else:
            direction = "neutral"
        top_features.append(
            {
                "feature": feature,
                "contribution": float(contribution),
                "direction": direction,
            }
        )

    return {
        "probability": probability,
        "risk_tier": risk_tier(probability),
        "top_features": top_features,
        "caution": CAUTION_MESSAGE,
    }


def get_metadata() -> Dict:
    return load_json(METADATA_PATH)


def get_fairness_report() -> Dict:
    return load_json(FAIRNESS_PATH)


def get_metrics_report() -> Dict:
    return load_json(METRICS_PATH)


def ensure_artifact_dir() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
