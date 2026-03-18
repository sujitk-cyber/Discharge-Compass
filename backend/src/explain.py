from __future__ import annotations

from typing import Dict, Tuple

import pandas as pd

from .config import BACKGROUND_PATH

try:
    import shap  # type: ignore

    SHAP_AVAILABLE = True
except Exception:  # pragma: no cover - optional dependency
    shap = None
    SHAP_AVAILABLE = False


def load_background() -> pd.DataFrame | None:
    if BACKGROUND_PATH.exists():
        return pd.read_csv(BACKGROUND_PATH)
    return None


def shap_local_contributions(base_model, X: pd.DataFrame) -> Dict[str, float] | None:
    if not SHAP_AVAILABLE:
        return None
    background = load_background()
    if background is None or background.empty:
        return None
    try:
        explainer = shap.Explainer(base_model, background, feature_names=list(X.columns))
        shap_values = explainer(X)
        values = shap_values.values
        if values.ndim == 3:
            values = values[0, :, -1]
        else:
            values = values[0]
        return {feature: float(values[idx]) for idx, feature in enumerate(X.columns)}
    except Exception:
        return None


def ablation_contributions(model, X: pd.DataFrame, reference: Dict[str, object]) -> Tuple[float, Dict[str, float]]:
    base_prob = float(model.predict_proba(X)[0, 1])
    contributions: Dict[str, float] = {}
    for feature in X.columns:
        ref_val = reference.get(feature, X.iloc[0][feature])
        X_ref = X.copy()
        X_ref[feature] = ref_val
        ref_prob = float(model.predict_proba(X_ref)[0, 1])
        contributions[feature] = base_prob - ref_prob
    return base_prob, contributions
