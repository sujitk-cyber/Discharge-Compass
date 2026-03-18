from __future__ import annotations

from typing import Dict, List

import numpy as np
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


def expected_calibration_error(y_true, y_prob, n_bins: int = 10) -> float:
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    bin_ids = np.digitize(y_prob, bins) - 1
    ece = 0.0
    for bin_id in range(n_bins):
        mask = bin_ids == bin_id
        if not np.any(mask):
            continue
        bin_prob = y_prob[mask]
        bin_true = y_true[mask]
        ece += (len(bin_prob) / len(y_prob)) * abs(bin_prob.mean() - bin_true.mean())
    return float(ece)


def classification_metrics(y_true, y_prob) -> Dict[str, float]:
    return {
        "auroc": float(roc_auc_score(y_true, y_prob)),
        "auprc": float(average_precision_score(y_true, y_prob)),
        "brier": float(brier_score_loss(y_true, y_prob)),
        "ece": expected_calibration_error(y_true, y_prob),
    }


def operating_point_metrics(y_true, y_prob, threshold: float) -> Dict[str, float]:
    y_pred = (y_prob >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    return {
        "threshold": float(threshold),
        "positive_rate": float(np.mean(y_pred)),
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn),
        "tp": int(tp),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
    }


def calibration_curve_data(y_true, y_prob, n_bins: int = 10) -> List[Dict[str, float]]:
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    bin_ids = np.digitize(y_prob, bins) - 1
    curve = []
    for bin_id in range(n_bins):
        mask = bin_ids == bin_id
        if not np.any(mask):
            continue
        curve.append(
            {
                "bin_start": float(bins[bin_id]),
                "bin_end": float(bins[bin_id + 1]),
                "mean_pred": float(np.mean(y_prob[mask])),
                "mean_true": float(np.mean(y_true[mask])),
                "count": int(np.sum(mask)),
            }
        )
    return curve
