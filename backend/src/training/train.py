from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib

from ..config import ARTIFACT_DIR
from .data import FEATURE_COLUMNS, compute_reference_values, load_data, sample_background
from .pipeline import fit_primary_with_calibration
from .split import split_dataset


def train(data_path: str, artifact_dir: Path) -> None:
    dataset = load_data(data_path)
    X_train, X_val, X_test, y_train, y_val, y_test = split_dataset(dataset)

    base_model, calibrated_model = fit_primary_with_calibration(X_train, y_train, X_val, y_val)

    artifact_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(calibrated_model, artifact_dir / "model.joblib")
    joblib.dump(base_model, artifact_dir / "base_model.joblib")

    reference = compute_reference_values(X_train)
    with (artifact_dir / "feature_reference.json").open("w") as handle:
        json.dump(reference, handle, indent=2)

    background = sample_background(X_train)
    background.to_csv(artifact_dir / "background_sample.csv", index=False)

    metadata = {
        "model_version": f"gbm-calibrated-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}",
        "training_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "feature_list": FEATURE_COLUMNS,
    }
    with (artifact_dir / "model_metadata.json").open("w") as handle:
        json.dump(metadata, handle, indent=2)

    # Save a small split summary for traceability
    split_info = {
        "train_rows": int(len(X_train)),
        "val_rows": int(len(X_val)),
        "test_rows": int(len(X_test)),
    }
    with (artifact_dir / "split_summary.json").open("w") as handle:
        json.dump(split_info, handle, indent=2)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train Discharge Compass model")
    parser.add_argument("--data", required=True, help="Path to CSV dataset")
    parser.add_argument(
        "--artifacts",
        default=str(ARTIFACT_DIR),
        help="Directory to write artifacts",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    train(args.data, Path(args.artifacts))


if __name__ == "__main__":
    main()
