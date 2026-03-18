from __future__ import annotations

import argparse
import shutil
import zipfile
from pathlib import Path
from urllib.request import urlretrieve

DEFAULT_URL = "https://archive.ics.uci.edu/ml/machine-learning-databases/00296/dataset_diabetes.zip"


def download(url: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    urlretrieve(url, dest)
    return dest


def extract(zip_path: Path, dest_dir: Path) -> None:
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(dest_dir)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download the UCI Diabetes dataset")
    parser.add_argument("--dest", default="data/raw", help="Destination directory")
    parser.add_argument("--url", default=DEFAULT_URL, help="Dataset URL")
    parser.add_argument("--local", default=None, help="Path to a local dataset zip to copy")
    parser.add_argument("--no-extract", action="store_true", help="Skip extraction")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    dest_dir = Path(args.dest)
    dest_dir.mkdir(parents=True, exist_ok=True)
    zip_path = dest_dir / "dataset_diabetes.zip"

    if args.local:
        local_path = Path(args.local)
        if local_path.suffix == ".csv":
            shutil.copy(local_path, dest_dir / local_path.name)
            print(f"Dataset copied to {dest_dir}")
            return
        shutil.copy(local_path, zip_path)
    else:
        download(args.url, zip_path)

    if not args.no_extract:
        extract(zip_path, dest_dir)

    print(f"Dataset downloaded to {dest_dir}")


if __name__ == "__main__":
    main()
