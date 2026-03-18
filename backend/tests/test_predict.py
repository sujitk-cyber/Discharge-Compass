import json
from pathlib import Path

import joblib
import pandas as pd
import pytest
from fastapi.testclient import TestClient

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


def create_dummy_artifacts(tmp_path: Path) -> None:
    df = pd.DataFrame(
        [
            VALID_PAYLOAD,
            {**VALID_PAYLOAD, "gender": "Male", "race": "AfricanAmerican", "age": "[50-60)", "time_in_hospital": 6},
            {**VALID_PAYLOAD, "gender": "Female", "race": "Hispanic", "age": "[70-80)", "time_in_hospital": 2},
            {**VALID_PAYLOAD, "gender": "Male", "race": "Asian", "age": "[40-50)", "time_in_hospital": 8},
        ]
    )
    y = pd.Series([0, 1, 0, 1])

    model = build_baseline_model()
    model.fit(df[FEATURE_COLUMNS], y)

    joblib.dump(model, tmp_path / "model.joblib")
    joblib.dump(model, tmp_path / "base_model.joblib")

    reference = {col: df[col].iloc[0] for col in FEATURE_COLUMNS}
    with (tmp_path / "feature_reference.json").open("w") as handle:
        json.dump(reference, handle)

    with (tmp_path / "model_metadata.json").open("w") as handle:
        json.dump(
            {
                "model_version": "test",
                "training_date": "2026-02-11",
                "feature_list": FEATURE_COLUMNS,
            },
            handle,
        )

    with (tmp_path / "fairness_report.json").open("w") as handle:
        json.dump({"generated_at": "2026-02-11", "metrics": {}}, handle)

    with (tmp_path / "eval_metrics.json").open("w") as handle:
        json.dump({"generated_at": "2026-02-11", "metrics": {}}, handle)


def build_client(tmp_path, monkeypatch, api_key: str | None = None):
    create_dummy_artifacts(tmp_path)
    monkeypatch.setenv("ARTIFACT_DIR", str(tmp_path))
    monkeypatch.setenv("MODEL_PATH", str(tmp_path / "model.joblib"))
    monkeypatch.setenv("BASE_MODEL_PATH", str(tmp_path / "base_model.joblib"))
    monkeypatch.setenv("REFERENCE_PATH", str(tmp_path / "feature_reference.json"))
    monkeypatch.setenv("METADATA_PATH", str(tmp_path / "model_metadata.json"))
    monkeypatch.setenv("FAIRNESS_PATH", str(tmp_path / "fairness_report.json"))
    monkeypatch.setenv("METRICS_PATH", str(tmp_path / "eval_metrics.json"))
    if api_key:
        monkeypatch.setenv("API_KEY", api_key)
    else:
        monkeypatch.delenv("API_KEY", raising=False)

    from importlib import reload
    import backend.src.config as config
    import backend.src.modeling as modeling
    import backend.src.main as main

    reload(config)
    reload(modeling)
    reload(main)

    return TestClient(main.app)


@pytest.fixture()
def client(tmp_path, monkeypatch):
    return build_client(tmp_path, monkeypatch)


def test_predict_endpoint(client):
    response = client.post("/predict", json=VALID_PAYLOAD)
    assert response.status_code == 200
    payload = response.json()
    assert 0.0 <= payload["probability"] <= 1.0
    assert payload["risk_tier"] in {"low", "medium", "high"}
    assert len(payload["top_features"]) <= 5


def test_predict_requires_api_key(tmp_path, monkeypatch):
    client = build_client(tmp_path, monkeypatch, api_key="secret")
    response = client.post("/predict", json=VALID_PAYLOAD)
    assert response.status_code == 401

    response = client.post("/predict", json=VALID_PAYLOAD, headers={"X-API-Key": "secret"})
    assert response.status_code == 200
