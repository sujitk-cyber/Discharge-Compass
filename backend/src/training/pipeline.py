from __future__ import annotations

from typing import Tuple

from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.frozen import FrozenEstimator
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from .data import CATEGORICAL_COLUMNS, NUMERIC_COLUMNS


def make_preprocessor() -> ColumnTransformer:
    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, NUMERIC_COLUMNS),
            ("cat", categorical_transformer, CATEGORICAL_COLUMNS),
        ]
    )


def build_baseline_model() -> Pipeline:
    return Pipeline(
        steps=[
            ("preprocess", make_preprocessor()),
            (
                "model",
                LogisticRegression(
                    max_iter=1000,
                    class_weight="balanced",
                    solver="liblinear",
                    C=0.1,
                    random_state=42,
                ),
            ),
        ]
    )


def build_primary_model() -> Pipeline:
    return Pipeline(
        steps=[
            ("preprocess", make_preprocessor()),
            (
                "model",
                GradientBoostingClassifier(
                    n_estimators=300,
                    max_depth=4,
                    learning_rate=0.05,
                    subsample=0.8,
                    min_samples_leaf=20,
                    max_features="sqrt",
                    random_state=42,
                ),
            ),
        ]
    )


def fit_primary_with_calibration(
    X_train,
    y_train,
    X_val,
    y_val,
) -> Tuple[Pipeline, CalibratedClassifierCV]:
    base_model = build_primary_model()
    base_model.fit(X_train, y_train)

    calibrator = CalibratedClassifierCV(FrozenEstimator(base_model), method="sigmoid")
    calibrator.fit(X_val, y_val)
    return base_model, calibrator
