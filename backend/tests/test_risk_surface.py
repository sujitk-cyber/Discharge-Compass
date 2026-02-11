from backend.tests.test_predict import build_client


def test_risk_surface_returns_grid(tmp_path, monkeypatch):
    client = build_client(tmp_path, monkeypatch)
    response = client.get(
        "/risk-surface?feature_x=time_in_hospital&feature_y=num_medications&steps=8"
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["feature_x"] == "time_in_hospital"
    assert payload["feature_y"] == "num_medications"
    assert len(payload["x_values"]) == 8
    assert len(payload["y_values"]) == 8
    assert len(payload["z_matrix"]) == 8
    assert len(payload["z_matrix"][0]) == 8


def test_risk_surface_rejects_categorical(tmp_path, monkeypatch):
    client = build_client(tmp_path, monkeypatch)
    response = client.get("/risk-surface?feature_x=race&feature_y=time_in_hospital")
    assert response.status_code == 422


def test_risk_surface_rejects_same_feature(tmp_path, monkeypatch):
    client = build_client(tmp_path, monkeypatch)
    response = client.get("/risk-surface?feature_x=time_in_hospital&feature_y=time_in_hospital")
    assert response.status_code == 422
