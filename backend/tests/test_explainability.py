import pandas as pd

from backend.src.explain import ablation_contributions
from backend.src.training.data import FEATURE_COLUMNS
from backend.src.training.pipeline import build_baseline_model

VALID_PAYLOAD = {
    "race": "Caucasian",
    "gender": "Female",
    "age": "[60-70)",
    "admission_type_id": 1,
    "discharge_disposition_id": 1,
    "admission_source_id": 7,
    "time_in_hospital": 4,
    "num_lab_procedures": 50,
    "num_procedures": 2,
    "num_medications": 14,
    "number_outpatient": 0,
    "number_emergency": 1,
    "number_inpatient": 0,
    "A1Cresult": ">7",
    "metformin": "Steady",
    "insulin": "Up",
    "change": "Ch",
    "diabetesMed": "Yes",
}


def test_ablation_contributions():
    df = pd.DataFrame(
        [
            VALID_PAYLOAD,
            {**VALID_PAYLOAD, "gender": "Male", "race": "AfricanAmerican", "age": "[50-60)", "time_in_hospital": 6},
            {**VALID_PAYLOAD, "gender": "Female", "race": "Hispanic", "age": "[70-80)", "time_in_hospital": 2},
        ]
    )
    y = pd.Series([0, 1, 0])

    model = build_baseline_model()
    model.fit(df[FEATURE_COLUMNS], y)

    reference = {col: df[col].iloc[0] for col in FEATURE_COLUMNS}
    X = df[FEATURE_COLUMNS].iloc[[0]]

    base_prob, contributions = ablation_contributions(model, X, reference)

    assert 0.0 <= base_prob <= 1.0
    assert len(contributions) == len(FEATURE_COLUMNS)
    assert all(isinstance(val, float) for val in contributions.values())
