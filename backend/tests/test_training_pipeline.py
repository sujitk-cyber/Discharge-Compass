import json
from pathlib import Path

import pandas as pd

from backend.src.training.evaluate import evaluate
from backend.src.training.train import train

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


def make_dataset(path: Path, rows: int = 40) -> None:
    records = []
    for idx in range(rows):
        row = dict(VALID_PAYLOAD)
        row["gender"] = "Male" if idx % 2 == 0 else "Female"
        row["race"] = "AfricanAmerican" if idx % 3 == 0 else "Caucasian"
        row["age"] = "[50-60)" if idx % 4 == 0 else "[60-70)"
        row["time_in_hospital"] = 3 + (idx % 5)
        row["num_lab_procedures"] = 40 + (idx % 10)
        row["readmitted"] = "<30" if idx % 2 == 0 else "NO"
        records.append(row)
    pd.DataFrame(records).to_csv(path, index=False)


def test_train_and_evaluate(tmp_path: Path):
    data_path = tmp_path / "train.csv"
    make_dataset(data_path)

    train(data_path.as_posix(), tmp_path)

    assert (tmp_path / "model.joblib").exists()
    assert (tmp_path / "base_model.joblib").exists()
    assert (tmp_path / "model_metadata.json").exists()

    evaluate(data_path.as_posix(), tmp_path, tmp_path / "metrics.json")

    metrics_path = tmp_path / "eval_metrics.json"
    fairness_path = tmp_path / "fairness_report.json"

    assert metrics_path.exists()
    assert fairness_path.exists()

    with metrics_path.open() as handle:
        payload = json.load(handle)
    assert "metrics" in payload
    assert "operating_points" in payload
    assert "calibration_curve" in payload
    assert "subgroup_performance" in payload

    with fairness_path.open() as handle:
        fairness_payload = json.load(handle)
    assert "metrics" in fairness_payload
    assert "race" in fairness_payload["metrics"]
