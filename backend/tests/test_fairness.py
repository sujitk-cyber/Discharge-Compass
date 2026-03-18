import numpy as np

from backend.src.training.fairness import compute_group_fairness


def test_compute_group_fairness_returns_keys():
    y_true = np.array([0, 1, 0, 1, 1, 0])
    y_prob = np.array([0.1, 0.9, 0.3, 0.8, 0.7, 0.2])
    groups = np.array(["A", "A", "B", "B", "B", "A"])

    report = compute_group_fairness(y_true, y_prob, groups)

    assert "equalized_odds_difference" in report
    assert "tpr_difference" in report
    assert "fpr_difference" in report
    assert "by_group" in report
    assert "overall" in report
