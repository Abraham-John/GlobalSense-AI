"""
GlobalSense AI - FastAPI API Endpoints
"""

from __future__ import annotations

import csv
import io
import json
import os
from typing import Dict, Any, List

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.schemas.sentiment import (
    AnalyzeRequest,
    AnalyzeResponse,
    BatchAnalyzeRequest,
    BatchAnalyzeResponse,
    ModelInfoResponse,
    ModelSwitchRequest,
    AnalyticsResponse,
)
from src.prediction import get_prediction_engine

router = APIRouter()


@router.get("/health", tags=["System"])
async def health_check() -> Dict[str, Any]:
    """Health probe verifying API is up, model state, and results artifact availability."""
    from pathlib import Path
    engine = get_prediction_engine()
    model_info = engine.get_model_info()

    # Check results status
    comp_file = Path(settings.OUTPUTS_DIR) / "model_comparison.json"
    results_status = "results loaded" if comp_file.exists() else "results not generated"

    # Distinct model state
    if not engine.loaded_models:
        model_state = "model failed: No models available in models directory"
    else:
        active = engine.loaded_models.get(engine.active_model_key)
        if active:
            model_state = f"model ready: {active['name']}"
        else:
            model_state = "model loading"

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "model_state": model_state,
        "results_status": results_status,
        "active_model": model_info.get("model_name", "None"),
        "active_model_key": model_info.get("active_model_key", "None"),
        "model_origin": model_info.get("model_origin", "unknown")
    }


@router.get("/model-info", response_model=ModelInfoResponse, tags=["Model"])
async def get_model_metadata() -> Dict[str, Any]:
    """
    Returns active model information, supported languages, label order,
    evaluation status (threshold >= 200), and available model checkpoints.
    """
    engine = get_prediction_engine()
    info = engine.get_model_info()
    if info.get("status") == "error":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=info.get("message", "Model not ready.")
        )
    return info


@router.post("/model/switch", tags=["Model"])
async def switch_model(payload: ModelSwitchRequest) -> Dict[str, Any]:
    """
    Switch active inference model (e.g., between baseline_a, baseline_b, bilstm, pretrained_xlmr).
    """
    engine = get_prediction_engine()
    success = engine.set_active_model(payload.model_key)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model key '{payload.model_key}' could not be loaded or is unavailable."
        )
    return {
        "status": "success",
        "message": f"Active model switched to {payload.model_key}",
        "active_model": engine.get_model_info()
    }


@router.post("/analyze", response_model=AnalyzeResponse, tags=["Sentiment Analysis"])
async def analyze_sentiment(payload: AnalyzeRequest) -> Dict[str, Any]:
    """
    Analyze sentiment of a single multilingual text snippet with language detection
    and genuine occlusion-based word importance attribution.
    """
    engine = get_prediction_engine()
    try:
        result = engine.analyze(
            text=payload.text,
            override_language=payload.language_override,
            explain=payload.explain
        )
        if payload.translate:
            try:
                from src.translation import translate_to_english
                source_lang = result.get("language", {}).get("language_code", "unknown")
                trans_res = translate_to_english(payload.text, source_lang)
                result["translation"] = trans_res
            except Exception as te:
                result["translation"] = {
                    "text": payload.text,
                    "source_lang": "unknown",
                    "model": "none",
                    "latency_ms": 0.0,
                    "status": "model_error",
                    "message": str(te)
                }
        return result
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Inference error: {str(e)}")


@router.post("/analyze/batch", response_model=BatchAnalyzeResponse, tags=["Sentiment Analysis"])
async def analyze_sentiment_batch(payload: BatchAnalyzeRequest) -> Dict[str, Any]:
    """
    Batch sentiment prediction with row-level validation and skipped-row logging.
    """
    engine = get_prediction_engine()
    try:
        return engine.analyze_batch(payload.texts, max_rows=payload.max_rows)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Batch error: {str(e)}")


@router.post("/analyze/upload-csv", response_model=BatchAnalyzeResponse, tags=["Sentiment Analysis"])
async def upload_and_analyze_csv(
    file: UploadFile = File(...),
    text_column: str = "text",
    max_rows: int = 500
) -> Dict[str, Any]:
    """
    Upload CSV file, extract specified text column, validate encoding, and run batch analysis.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a .csv file."
        )

    content = await file.read()
    if len(content) > settings.MAX_CSV_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"CSV file exceeds maximum size limit of {settings.MAX_CSV_FILE_SIZE_BYTES // (1024*1024)} MB."
        )

    # Safe decoding with utf-8 / latin-1 fallback
    decoded_text = ""
    for encoding in ["utf-8-sig", "utf-8", "latin-1", "cp1252"]:
        try:
            decoded_text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if not decoded_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to decode CSV file. Please ensure it is saved in UTF-8 encoding."
        )

    reader = csv.DictReader(io.StringIO(decoded_text))
    if not reader.fieldnames:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV file appears to be empty.")

    # Match column name case-insensitively if not found directly
    target_col = None
    for field in reader.fieldnames:
        if field.strip().lower() == text_column.strip().lower():
            target_col = field
            break

    if target_col is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Column '{text_column}' not found. Available columns: {list(reader.fieldnames)}"
        )

    extracted_texts = []
    for row in reader:
        extracted_texts.append(row.get(target_col, ""))

    engine = get_prediction_engine()
    return engine.analyze_batch(extracted_texts, max_rows=max_rows)


@router.get("/analytics", response_model=AnalyticsResponse, tags=["Analytics & Evaluation"])
async def get_evaluation_analytics() -> Dict[str, Any]:
    """
    Serves genuine evaluation artifacts produced from running the evaluation suite.
    Includes dataset statistics, held-out model comparison, calibration ECE, and error analysis.
    """
    outputs_dir = settings.OUTPUTS_DIR

    dataset_stats_file = os.path.join(outputs_dir, "dataset_statistics.json")
    model_comp_file = os.path.join(outputs_dir, "model_comparison.json")
    calib_file = os.path.join(outputs_dir, "calibration.json")
    error_file = os.path.join(outputs_dir, "error_analysis.json")
    trans_exp_file = os.path.join(outputs_dir, "translation_experiment.json")

    def load_json_if_exists(filepath: str) -> Optional[Dict[str, Any]]:
        if os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return None
        return None

    dataset_stats = load_json_if_exists(dataset_stats_file)
    model_comp = load_json_if_exists(model_comp_file)
    calib = load_json_if_exists(calib_file)
    errors = load_json_if_exists(error_file)
    trans_exp = load_json_if_exists(trans_exp_file)

    if not any([dataset_stats, model_comp, calib, errors, trans_exp]):
        return {
            "status": "not_generated",
            "dataset_statistics": None,
            "model_comparison": None,
            "calibration": None,
            "error_analysis": None,
            "translation_experiment": None
        }

    return {
        "status": "success",
        "dataset_statistics": dataset_stats,
        "model_comparison": model_comp,
        "calibration": calib,
        "error_analysis": errors,
        "translation_experiment": trans_exp
    }
