from backend.src.validation import validate_features

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


def test_validation_rejects_negative():
    payload = dict(VALID_PAYLOAD)
    payload["time_in_hospital"] = 0
    try:
        validate_features(payload)
    except ValueError as exc:
        assert "time_in_hospital" in str(exc)
    else:
        raise AssertionError("Expected validation error")


def test_validation_rejects_invalid_category():
    payload = dict(VALID_PAYLOAD)
    payload["race"] = "InvalidRace"
    try:
        validate_features(payload)
    except ValueError as exc:
        assert "race" in str(exc)
    else:
        raise AssertionError("Expected validation error")


def test_validation_rejects_out_of_range_ids():
    payload = dict(VALID_PAYLOAD)
    payload["admission_type_id"] = 99
    try:
        validate_features(payload)
    except ValueError as exc:
        assert "admission_type_id" in str(exc)
    else:
        raise AssertionError("Expected validation error")


def test_validation_rejects_out_of_range_counts():
    payload = dict(VALID_PAYLOAD)
    payload["num_medications"] = 1000
    try:
        validate_features(payload)
    except ValueError as exc:
        assert "num_medications" in str(exc)
    else:
        raise AssertionError("Expected validation error")
