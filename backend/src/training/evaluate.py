from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance

from ..config import ARTIFACT_DIR
from .data import FEATURE_COLUMNS, load_data
from .fairness import compute_group_fairness
from .metrics import calibration_curve_data, classification_metrics, operating_point_metrics
from .pipeline import build_baseline_model, fit_primary_with_calibration
from .split import split_dataset


def compute_group_metrics(y_true: np.ndarray, y_prob: np.ndarray, groups: np.ndarray) -> dict:
    metrics_by_group = {}
    for group in sorted(set(groups.tolist())):
        mask = groups == group
        if np.sum(mask) < 5 or len(set(y_true[mask].tolist())) < 2:
            metrics_by_group[group] = {
                "count": int(np.sum(mask)),
                "positive_rate": float(np.mean(y_true[mask])) if np.sum(mask) else 0.0,
                "metrics": None,
            }
            continue
        metrics_by_group[group] = {
            "count": int(np.sum(mask)),
            "positive_rate": float(np.mean(y_true[mask])),
            "metrics": classification_metrics(y_true[mask], y_prob[mask]),
        }
    return metrics_by_group


AGE_BIN_MERGE = {
    "[0-10)": "Under 30",
    "[10-20)": "Under 30",
    "[20-30)": "Under 30",
}


def _merged_age(age_series: pd.Series) -> pd.Series:
    """Merge sparse pediatric / young-adult age bins into one bucket."""
    return age_series.map(lambda v: AGE_BIN_MERGE.get(v, v))


def evaluate(data_path: str, artifact_dir: Path, frontend_public: Path | None = None) -> None:
    dataset = load_data(data_path)
    X_train, X_val, X_test, y_train, y_val, y_test = split_dataset(dataset)

    model_path = artifact_dir / "model.joblib"

    if model_path.exists():
        primary_model = joblib.load(model_path)
    else:
        _, primary_model = fit_primary_with_calibration(X_train, y_train, X_val, y_val)

    baseline_model = build_baseline_model()
    baseline_model.fit(pd.concat([X_train, X_val]), pd.concat([y_train, y_val]))

    primary_probs = primary_model.predict_proba(X_test)[:, 1]
    baseline_probs = baseline_model.predict_proba(X_test)[:, 1]

    top_15_threshold = float(np.quantile(primary_probs, 0.85))

    metrics = {
        "primary": classification_metrics(y_test, primary_probs),
        "baseline": classification_metrics(y_test, baseline_probs),
    }

    operating_points = {
        "threshold_0_5": operating_point_metrics(y_test, primary_probs, 0.5),
        "top_15_percent": operating_point_metrics(y_test, primary_probs, top_15_threshold),
    }

    calibration_curve = calibration_curve_data(y_test.to_numpy(), primary_probs)

    age_merged = _merged_age(X_test["age"])

    subgroup_performance = {
        "race": compute_group_metrics(y_test.to_numpy(), primary_probs, X_test["race"].to_numpy()),
        "gender": compute_group_metrics(y_test.to_numpy(), primary_probs, X_test["gender"].to_numpy()),
        "age": compute_group_metrics(y_test.to_numpy(), primary_probs, age_merged.to_numpy()),
    }

    fairness = {
        "race": compute_group_fairness(y_test, primary_probs, X_test["race"]),
        "gender": compute_group_fairness(y_test, primary_probs, X_test["gender"]),
        "age": compute_group_fairness(y_test, primary_probs, age_merged),
    }

    perm_result = permutation_importance(
        primary_model,
        X_test,
        y_test,
        n_repeats=5,
        random_state=42,
        n_jobs=-1,
        scoring="roc_auc",
    )
    global_importance = {
        feature: float(perm_result.importances_mean[idx])
        for idx, feature in enumerate(FEATURE_COLUMNS)
    }

    artifact_dir.mkdir(parents=True, exist_ok=True)

    metrics_payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "metrics": metrics,
        "operating_points": operating_points,
        "calibration_curve": calibration_curve,
        "subgroup_performance": subgroup_performance,
    }
    with (artifact_dir / "eval_metrics.json").open("w") as handle:
        json.dump(metrics_payload, handle, indent=2)

    fairness_payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "metrics": fairness,
    }
    with (artifact_dir / "fairness_report.json").open("w") as handle:
        json.dump(fairness_payload, handle, indent=2)

    with (artifact_dir / "global_importance.json").open("w") as handle:
        json.dump(global_importance, handle, indent=2)

    if frontend_public is not None:
        frontend_public.parent.mkdir(parents=True, exist_ok=True)
        with frontend_public.open("w") as handle:
            json.dump(metrics_payload, handle, indent=2)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate Discharge Compass model")
    parser.add_argument("--data", required=True, help="Path to CSV dataset")
    parser.add_argument(
        "--artifacts",
        default=str(ARTIFACT_DIR),
        help="Directory to write artifacts",
    )
    parser.add_argument(
        "--frontend-public",
        default=None,
        help="Optional path to write metrics JSON for frontend",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    frontend_public = Path(args.frontend_public) if args.frontend_public else None
    evaluate(args.data, Path(args.artifacts), frontend_public)


if __name__ == "__main__":
    main()
