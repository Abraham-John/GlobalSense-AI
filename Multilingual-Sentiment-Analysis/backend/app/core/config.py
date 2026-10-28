"""
GlobalSense AI - Backend Configuration Settings
"""

import os
from pathlib import Path
from pydantic import BaseModel

# Resolve root backend path correctly (3 levels up: config.py -> core -> app -> backend)
BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseModel):
    PROJECT_NAME: str = "GlobalSense AI Backend"
    VERSION: str = "1.1.0"
    API_V1_PREFIX: str = "/api"
    
    # Paths strictly resolved from file location
    BASE_DIR: str = str(BACKEND_ROOT)
    MODELS_DIR: str = str(BACKEND_ROOT / "models")
    PRETRAINED_DIR: str = str(BACKEND_ROOT / "models" / "pretrained_xlmr")
    RESULTS_DIR: str = str(BACKEND_ROOT / "results")
    OUTPUTS_DIR: str = str(BACKEND_ROOT / "results" / "outputs")
    GRAPHS_DIR: str = str(BACKEND_ROOT / "results" / "graphs")
    DATASET_DIR: str = str(BACKEND_ROOT / "dataset" / "processed")
    
    # Inference & Uncertainty thresholds
    UNCERTAINTY_THRESHOLD: float = float(os.getenv("UNCERTAINTY_THRESHOLD", "0.60"))
    ALLOW_ONLINE_DOWNLOAD: bool = os.getenv("ALLOW_ONLINE_DOWNLOAD", "true").lower() in ("1", "true", "yes")

    # Request limits
    MAX_TEXT_LENGTH: int = 5000
    MAX_BATCH_ROWS: int = 500
    MAX_CSV_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]


settings = Settings()

