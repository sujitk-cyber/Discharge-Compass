from __future__ import annotations

from typing import Dict

import numpy as np
from fairlearn.metrics import (
    MetricFrame,
    equalized_odds_difference,
    false_positive_rate,
    true_positive_rate,
)

# Groups with fewer than this many *positive* cases are excluded from the
# headline gap metric (they still appear in per-group breakdowns).
MIN_POSITIVES_FOR_GAP = 10


def compute_group_fairness(
    y_true,
    y_prob,
    sensitive_features,
    threshold: float | None = None,
) -> Dict:
    if threshold is None:
        threshold = float(np.quantile(y_prob, 0.85))
        threshold = max(threshold, 0.01)
    y_pred = (y_prob >= threshold).astype(int)

    y_true_arr = np.asarray(y_true)
    y_pred_arr = np.asarray(y_pred)
    sf_arr = np.asarray(sensitive_features)

    # -- full metric frame (all groups) --
    metric_frame = MetricFrame(
        metrics={"tpr": true_positive_rate, "fpr": false_positive_rate},
        y_true=y_true_arr,
        y_pred=y_pred_arr,
        sensitive_features=sf_arr,
    )

    group_metrics = metric_frame.by_group.to_dict()
    overall = metric_frame.overall.to_dict()

    # per-group counts so the frontend can show sample size
    group_counts: Dict[str, Dict] = {}
    for g in sorted(set(sf_arr.tolist())):
        mask = sf_arr == g
        n = int(np.sum(mask))
        n_pos = int(np.sum(y_true_arr[mask]))
        group_counts[str(g)] = {"n": n, "n_positive": n_pos}

    # -- reliable groups only (enough positives) for gap calculation --
    reliable_groups = [
        g for g, info in group_counts.items() if info["n_positive"] >= MIN_POSITIVES_FOR_GAP
    ]

    if len(reliable_groups) >= 2:
        reliable_mask = np.isin(sf_arr, reliable_groups)
        eod = float(
            equalized_odds_difference(
                y_true_arr[reliable_mask],
                y_pred_arr[reliable_mask],
                sensitive_features=sf_arr[reliable_mask],
            )
        )
        reliable_tpr = [group_metrics["tpr"][g] for g in reliable_groups if g in group_metrics.get("tpr", {})]
        reliable_fpr = [group_metrics["fpr"][g] for g in reliable_groups if g in group_metrics.get("fpr", {})]
        tpr_diff = float(np.max(reliable_tpr) - np.min(reliable_tpr)) if reliable_tpr else 0.0
        fpr_diff = float(np.max(reliable_fpr) - np.min(reliable_fpr)) if reliable_fpr else 0.0
    else:
        eod = 0.0
        tpr_diff = 0.0
        fpr_diff = 0.0

    return {
        "equalized_odds_difference": eod,
        "tpr_difference": tpr_diff,
        "fpr_difference": fpr_diff,
        "by_group": group_metrics,
        "group_counts": group_counts,
        "reliable_groups": reliable_groups,
        "overall": overall,
        "threshold_used": float(threshold),
    }
