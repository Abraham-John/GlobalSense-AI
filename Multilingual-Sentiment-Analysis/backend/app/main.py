"""
GlobalSense AI - FastAPI Main Application Entry Point
"""

from __future__ import annotations

import os
import sys

# Ensure backend root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.endpoints import router as api_router
from app.core.config import settings
from src.prediction import get_prediction_engine

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Preheat, resolve paths, and verify models at application launch."""
    print("=" * 70)
    print(f"[FastAPI] Initializing {settings.PROJECT_NAME} v{settings.VERSION}...")
    print(f"[FastAPI] Backend Root:      {settings.BASE_DIR}")
    print(f"[FastAPI] Models Directory:  {settings.MODELS_DIR}")
    print(f"[FastAPI] Results Directory: {settings.RESULTS_DIR}")
    print(f"[FastAPI] Outputs Directory: {settings.OUTPUTS_DIR}")
    print(f"[FastAPI] Uncertainty Thresh: {settings.UNCERTAINTY_THRESHOLD}")
    print("=" * 70)
    engine = get_prediction_engine()
    model_info = engine.get_model_info()
    print(f"[FastAPI] Active inference model: {model_info.get('model_name')}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise-grade Multilingual Sentiment Analysis Platform supporting 10 languages (including Hindi, Hinglish, Arabic, Japanese) across 3 canonical classes (Positive, Negative, Neutral) with genuine occlusion-based explainability.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# CORS middleware for development & production
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount generated evaluation graphs
graphs_dir = settings.GRAPHS_DIR
os.makedirs(graphs_dir, exist_ok=True)
app.mount("/graphs", StaticFiles(directory=graphs_dir), name="graphs")

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Structured JSON error responses without leaking internal server secrets."""
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "An internal server error occurred while processing the request.",
            "detail": str(exc)
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
