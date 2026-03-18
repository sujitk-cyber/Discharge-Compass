from __future__ import annotations

from typing import Dict

RACE_VALUES = {"Caucasian", "AfricanAmerican", "Asian", "Hispanic", "Other", "Unknown"}
GENDER_VALUES = {"Male", "Female", "Unknown/Invalid"}
AGE_VALUES = {
    "[0-10)",
    "[10-20)",
    "[20-30)",
    "[30-40)",
    "[40-50)",
    "[50-60)",
    "[60-70)",
    "[70-80)",
    "[80-90)",
    "[90-100)",
}
A1C_VALUES = {"None", "Norm", ">7", ">8"}
MED_STATUS_VALUES = {"No", "Steady", "Up", "Down"}
MED_CHANGE_VALUES = {"No", "Ch"}
DIABETES_MED_VALUES = {"Yes", "No"}

NUMERIC_RANGES = {
    "admission_type_id": (1, 9),
    "discharge_disposition_id": (1, 30),
    "admission_source_id": (1, 25),
    "time_in_hospital": (1, 30),
    "num_lab_procedures": (0, 200),
    "num_procedures": (0, 50),
    "num_medications": (0, 100),
    "number_outpatient": (0, 50),
    "number_emergency": (0, 50),
    "number_inpatient": (0, 50),
}


def validate_features(payload: Dict) -> None:
    if payload.get("race") not in RACE_VALUES:
        raise ValueError("race must be one of the allowed categories")
    if payload.get("gender") not in GENDER_VALUES:
        raise ValueError("gender must be one of the allowed categories")
    if payload.get("age") not in AGE_VALUES:
        raise ValueError("age must be one of the allowed categories")
    if payload.get("A1Cresult") not in A1C_VALUES:
        raise ValueError("A1Cresult must be one of the allowed categories")
    if payload.get("metformin") not in MED_STATUS_VALUES:
        raise ValueError("metformin must be one of the allowed categories")
    if payload.get("insulin") not in MED_STATUS_VALUES:
        raise ValueError("insulin must be one of the allowed categories")
    if payload.get("change") not in MED_CHANGE_VALUES:
        raise ValueError("change must be one of the allowed categories")
    if payload.get("diabetesMed") not in DIABETES_MED_VALUES:
        raise ValueError("diabetesMed must be one of the allowed categories")

    for feature, (low, high) in NUMERIC_RANGES.items():
        value = payload.get(feature)
        if value is None:
            raise ValueError(f"{feature} is required")
        if value < low:
            raise ValueError(f"{feature} must be >= {low}")
        if value > high:
            raise ValueError(f"{feature} must be <= {high}")
