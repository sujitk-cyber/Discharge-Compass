from __future__ import annotations

import logging
import time
from functools import lru_cache

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
import pandas as pd
import io

from pathlib import Path

from .config import (
    API_KEY,
    AUTO_TRAIN,
    AUTO_TRAIN_DATA,
    CORS_ORIGINS,
    MODEL_PATH,
    RATE_LIMIT_ENABLED,
    RATE_LIMIT_PER_MINUTE,
    RISK_SURFACE_CACHE_SIZE,
    RISK_SURFACE_MAX_STEPS,
)
from .auth import api_key_dependency
from .auth_jwt import (
    create_token,
    get_current_user,
    get_optional_user,
    hash_password,
    verify_password,
)
from .database import create_user, get_upload, get_user_by_email, init_db, list_uploads, save_upload
from .modeling import (
    get_fairness_report,
    get_metadata,
    get_metrics_report,
    load_model,
    predict,
    risk_tier,
)
from .rate_limiter import RateLimiter, rate_limit_dependency
from .schemas import FairnessReport, MetricsReport, ModelMetadata, PredictRequest, PredictResponse
from .validation import NUMERIC_RANGES, validate_features

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("discharge-compass")

app = FastAPI(title="Discharge Compass API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

route_dependencies = []
if RATE_LIMIT_ENABLED:
    limiter = RateLimiter(RATE_LIMIT_PER_MINUTE)
    route_dependencies.append(Depends(rate_limit_dependency(limiter)))
if API_KEY:
    route_dependencies.append(Depends(api_key_dependency(API_KEY)))


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start) * 1000
    logger.info("%s %s %s %.2fms", request.method, request.url.path, response.status_code, duration_ms)
    return response


@app.on_event("startup")
async def ensure_artifacts():
    init_db()
    if Path(AUTO_TRAIN_DATA).exists() and AUTO_TRAIN:
        try:
            from .config import ARTIFACT_DIR, MODEL_PATH
            if MODEL_PATH.exists():
                return
            from .training.train import train
            from .training.evaluate import evaluate

            logger.info("Auto-training model using %s", AUTO_TRAIN_DATA)
            train(AUTO_TRAIN_DATA, ARTIFACT_DIR)
            evaluate(AUTO_TRAIN_DATA, ARTIFACT_DIR, None)
        except Exception as exc:
            logger.warning("Auto-train failed: %s", exc)
    elif AUTO_TRAIN:
        logger.warning("AUTO_TRAIN set but data path not found: %s", AUTO_TRAIN_DATA)


@app.get("/")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/health")
async def health_check() -> dict:
    try:
        load_model()
        try:
            metadata = get_metadata()
        except FileNotFoundError:
            metadata = {}
        return {
            "status": "ok",
            "model_loaded": True,
            "model_version": metadata.get("model_version"),
        }
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Auth endpoints (no API key required) ──


from pydantic import BaseModel as PydanticBase, EmailStr


class RegisterRequest(PydanticBase):
    email: str
    name: str
    password: str


class LoginRequest(PydanticBase):
    email: str
    password: str


@app.post("/auth/register")
async def register(body: RegisterRequest):
    if len(body.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters.")
    if not body.name.strip():
        raise HTTPException(status_code=422, detail="Name is required.")
    try:
        user = create_user(body.email, body.name, hash_password(body.password))
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"]}}


@app.post("/auth/login")
async def login(body: LoginRequest):
    user = get_user_by_email(body.email)
    if user is None or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"]}}


@app.get("/auth/me")
async def me(request: Request):
    payload = get_current_user(request)
    user = get_user_by_email(payload["email"])
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user["id"], "email": user["email"], "name": user["name"]}


# ── Upload history endpoints ──


@app.get("/uploads")
async def uploads_list(request: Request):
    payload = get_current_user(request)
    return list_uploads(int(payload["sub"]))


@app.get("/uploads/{upload_id}")
async def upload_detail(upload_id: int, request: Request):
    payload = get_current_user(request)
    record = get_upload(upload_id, int(payload["sub"]))
    if record is None:
        raise HTTPException(status_code=404, detail="Upload not found")
    return record


@app.post("/predict", response_model=PredictResponse, dependencies=route_dependencies)
async def predict_endpoint(payload: PredictRequest):
    try:
        validate_features(payload.model_dump())
        return predict(payload.model_dump())
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


BATCH_MAX_ROWS = 500
REQUIRED_COLUMNS = [
    "race", "gender", "age", "admission_type_id", "discharge_disposition_id",
    "admission_source_id", "time_in_hospital", "num_lab_procedures",
    "num_procedures", "num_medications", "number_outpatient",
    "number_emergency", "number_inpatient", "A1Cresult", "metformin",
    "insulin", "change", "diabetesMed",
]


@app.post("/predict-batch", dependencies=route_dependencies)
async def predict_batch(request: Request, file: UploadFile = File(...)):
    fname = (file.filename or "").lower()
    if not (fname.endswith(".csv") or fname.endswith(".xlsx") or fname.endswith(".xls")):
        raise HTTPException(status_code=422, detail="Please upload a .csv or .xlsx file.")

    contents = await file.read()

    try:
        if fname.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {exc}")

    df.columns = [c.strip() for c in df.columns]

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing columns: {', '.join(missing)}. Download the template for the correct format.",
        )

    if len(df) > BATCH_MAX_ROWS:
        raise HTTPException(status_code=422, detail=f"Maximum {BATCH_MAX_ROWS} rows per upload.")

    if len(df) == 0:
        raise HTTPException(status_code=422, detail="File contains no data rows.")

    model = load_model()
    rows = df[REQUIRED_COLUMNS].copy()

    for col in ["admission_type_id", "discharge_disposition_id", "admission_source_id",
                 "time_in_hospital", "num_lab_procedures", "num_procedures",
                 "num_medications", "number_outpatient", "number_emergency", "number_inpatient"]:
        rows[col] = pd.to_numeric(rows[col], errors="coerce").fillna(0).astype(int)

    for col in ["race", "gender", "age", "A1Cresult", "metformin", "insulin", "change", "diabetesMed"]:
        rows[col] = rows[col].astype(str).str.strip()

    probs = model.predict_proba(rows)[:, 1]

    results = []
    for i, prob in enumerate(probs):
        p = float(prob)
        tier = risk_tier(p)
        results.append({
            "row": i + 1,
            "probability": round(p, 4),
            "risk_tier": tier,
            "risk_pct": f"{p * 100:.1f}%",
        })

    summary = {
        "total": len(results),
        "high": sum(1 for r in results if r["risk_tier"] == "high"),
        "medium": sum(1 for r in results if r["risk_tier"] == "medium"),
        "low": sum(1 for r in results if r["risk_tier"] == "low"),
        "avg_risk": round(float(np.mean(probs)) * 100, 1),
    }

    # persist if user is logged in
    user = get_optional_user(request)
    upload_id = None
    if user is not None:
        upload_id = save_upload(
            user_id=int(user["sub"]),
            filename=file.filename or "upload",
            row_count=len(results),
            summary=summary,
            results=results,
        )

    return JSONResponse({"results": results, "summary": summary, "upload_id": upload_id})


@app.get("/model-metadata", response_model=ModelMetadata, dependencies=route_dependencies)
async def model_metadata():
    try:
        return get_metadata()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.get("/fairness-report", response_model=FairnessReport, dependencies=route_dependencies)
async def fairness_report():
    try:
        return get_fairness_report()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.get("/metrics", response_model=MetricsReport, dependencies=route_dependencies)
async def metrics_report():
    try:
        return get_metrics_report()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


BASE_SURFACE_PAYLOAD = {
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


@lru_cache(maxsize=RISK_SURFACE_CACHE_SIZE)
def _compute_surface(feature_x: str, feature_y: str, steps: int, model_mtime: float):
    (x_low, x_high) = NUMERIC_RANGES[feature_x]
    (y_low, y_high) = NUMERIC_RANGES[feature_y]

    x_values = np.linspace(x_low, x_high, steps)
    y_values = np.linspace(y_low, y_high, steps)

    model = load_model()
    if not hasattr(model, "predict_proba"):
        raise HTTPException(status_code=500, detail="Model does not support predict_proba")

    grid_payloads = []
    for x_val in x_values:
        for y_val in y_values:
            payload = dict(BASE_SURFACE_PAYLOAD)
            payload[feature_x] = float(x_val)
            payload[feature_y] = float(y_val)
            grid_payloads.append(payload)

    X = pd.DataFrame(grid_payloads)
    probs = model.predict_proba(X)[:, 1]
    z_matrix = []
    idx = 0
    for _ in range(steps):
        row = []
        for _ in range(steps):
            row.append(float(probs[idx]))
            idx += 1
        z_matrix.append(row)

    return {
        "feature_x": feature_x,
        "feature_y": feature_y,
        "x_values": [float(val) for val in x_values],
        "y_values": [float(val) for val in y_values],
        "z_matrix": z_matrix,
        "model_mtime": model_mtime,
    }


@app.get("/risk-surface", dependencies=route_dependencies)
async def risk_surface(
    feature_x: str,
    feature_y: str,
    steps: int = 25,
):
    if feature_x not in NUMERIC_RANGES or feature_y not in NUMERIC_RANGES:
        raise HTTPException(status_code=422, detail="feature_x and feature_y must be numeric features")
    if feature_x == feature_y:
        raise HTTPException(status_code=422, detail="feature_x and feature_y must be different")
    if steps < 2 or steps > RISK_SURFACE_MAX_STEPS:
        raise HTTPException(status_code=422, detail=f"steps must be between 2 and {RISK_SURFACE_MAX_STEPS}")

    model_mtime = MODEL_PATH.stat().st_mtime if MODEL_PATH.exists() else 0.0
    result = _compute_surface(feature_x, feature_y, steps, model_mtime)
    result.pop("model_mtime", None)
    return result
