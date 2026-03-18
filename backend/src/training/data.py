from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple

import pandas as pd

FEATURE_COLUMNS: List[str] = [
    "race",
    "gender",
    "age",
    "admission_type_id",
    "discharge_disposition_id",
    "admission_source_id",
    "time_in_hospital",
    "num_lab_procedures",
    "num_procedures",
    "num_medications",
    "number_outpatient",
    "number_emergency",
    "number_inpatient",
    "A1Cresult",
    "metformin",
    "insulin",
    "change",
    "diabetesMed",
]

TARGET_COLUMN = "readmitted"

CATEGORICAL_COLUMNS = [
    "race",
    "gender",
    "age",
    "A1Cresult",
    "metformin",
    "insulin",
    "change",
    "diabetesMed",
]

NUMERIC_COLUMNS = [
    "admission_type_id",
    "discharge_disposition_id",
    "admission_source_id",
    "time_in_hospital",
    "num_lab_procedures",
    "num_procedures",
    "num_medications",
    "number_outpatient",
    "number_emergency",
    "number_inpatient",
]


@dataclass
class Dataset:
    X: pd.DataFrame
    y: pd.Series


READMISSION_MAPPING = {
    "<30": 1,
    ">30": 0,
    "NO": 0,
    "YES": 1,
    "0": 0,
    "1": 1,
}


def load_data(path: str) -> Dataset:
    df = pd.read_csv(path)
    missing = [col for col in FEATURE_COLUMNS + [TARGET_COLUMN] if col not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in dataset: {missing}")

    df = df[FEATURE_COLUMNS + [TARGET_COLUMN]].copy()
    df[TARGET_COLUMN] = df[TARGET_COLUMN].astype(str).map(READMISSION_MAPPING).fillna(0).astype(int)

    for col in CATEGORICAL_COLUMNS:
        df[col] = df[col].fillna("Unknown").astype(str)

    for col in NUMERIC_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]
    return Dataset(X=X, y=y)


def compute_reference_values(X: pd.DataFrame) -> dict:
    reference = {}
    for col in CATEGORICAL_COLUMNS:
        reference[col] = X[col].mode(dropna=True)[0] if not X[col].mode().empty else "Unknown"
    for col in NUMERIC_COLUMNS:
        reference[col] = float(X[col].median())
    return reference


def sample_background(X: pd.DataFrame, n: int = 100) -> pd.DataFrame:
    if len(X) <= n:
        return X.copy()
    return X.sample(n=n, random_state=42)
