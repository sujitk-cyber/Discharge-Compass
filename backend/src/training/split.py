from __future__ import annotations

from typing import Tuple

from sklearn.model_selection import train_test_split

from .data import Dataset


def split_dataset(dataset: Dataset, test_size: float = 0.15, val_size: float = 0.15, seed: int = 42):
    X_temp, X_test, y_temp, y_test = train_test_split(
        dataset.X,
        dataset.y,
        test_size=test_size,
        random_state=seed,
        stratify=dataset.y,
    )
    val_ratio = val_size / (1 - test_size)
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp,
        y_temp,
        test_size=val_ratio,
        random_state=seed,
        stratify=y_temp,
    )
    return X_train, X_val, X_test, y_train, y_val, y_test
