PYTHON=python3
VENV=.venv
VENV_BIN=$(VENV)/bin
PIP=$(VENV_BIN)/pip
PY=$(VENV_BIN)/python

.PHONY: setup train run test

setup:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install -r backend/requirements.txt -r backend/requirements-dev.txt
	cd frontend && npm install
	$(MAKE) train

train:
	$(PY) -m backend.src.training.train --data data/sample_synthetic.csv --artifacts backend/artifacts
	$(PY) -m backend.src.training.evaluate --data data/sample_synthetic.csv --artifacts backend/artifacts --frontend-public frontend/public/metrics.json

run:
	docker-compose up --build

test:
	$(PY) -m pytest backend/tests
	cd frontend && npm run test
