"""
GlobalSense AI - Pydantic Request & Response Data Contracts
Strict type validation and serialization for multilingual sentiment analysis.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class LanguageInfo(BaseModel):
    language_code: str = Field(..., json_schema_extra={"example": "en"})
    language_name: str = Field(..., json_schema_extra={"example": "English"})
    script: str = Field(..., json_schema_extra={"example": "Latin"})
    confidence: float = Field(..., json_schema_extra={"example": 0.98})
    status: str = Field(..., json_schema_extra={"example": "supported"})
    is_override: bool = False


class ModelInfo(BaseModel):
    key: str = Field(..., json_schema_extra={"example": "baseline_b"})
    name: str = Field(..., json_schema_extra={"example": "Baseline B (Word + Char n-gram TF-IDF + Logistic Regression)"})
    origin: str = Field(..., json_schema_extra={"example": "trained_locally"})
    origin_label: str = Field(..., json_schema_extra={"example": "Trained Locally on 10-Language Balanced Corpus"})


class OcclusionToken(BaseModel):
    token: str
    score: float
    raw_delta: float
    impact: str  # "supports" | "opposes" | "neutral"


class OcclusionExplanation(BaseModel):
    method: str = "occlusion-based importance"
    tokens: List[OcclusionToken]
    baseline_confidence: float


class TranslationResult(BaseModel):
    text: str
    source_lang: str
    model: str
    latency_ms: float
    status: str
    message: Optional[str] = None


class TextStatistics(BaseModel):
    word_count: int
    char_count: int
    sentence_count: int
    reading_time_seconds: float
    lexical_diversity: float
    dominant_script: str


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Raw input text to analyze")
    language_override: Optional[str] = Field(None, description="Optional ISO code to override auto-detection (e.g. 'hi-Latn', 'fr')")
    explain: bool = Field(True, description="Whether to compute genuine occlusion-based word importance")
    translate: bool = Field(False, description="Request English translation alongside sentiment")


class AnalyzeResponse(BaseModel):
    text: str
    sentiment: str = Field(..., json_schema_extra={"example": "Positive"})
    raw_sentiment: Optional[str] = None
    confidence: float = Field(..., json_schema_extra={"example": 0.884})
    is_uncertain: Optional[bool] = False
    uncertainty_notice: Optional[str] = None
    probabilities: Dict[str, float] = Field(..., json_schema_extra={"example": {"Positive": 0.884, "Negative": 0.065, "Neutral": 0.051}})
    language: LanguageInfo
    model: ModelInfo
    explanation: Optional[OcclusionExplanation] = None
    translation: Optional[TranslationResult] = None
    statistics: TextStatistics
    latency_ms: float
    disclaimer: str


class BatchAnalyzeRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, max_length=500, description="List of text records to evaluate")
    max_rows: int = Field(500, ge=1, le=1000)


class BatchRecordResult(BaseModel):
    row_index: int
    text: str
    sentiment: str
    raw_sentiment: Optional[str] = None
    confidence: float
    is_uncertain: Optional[bool] = False
    probabilities: Dict[str, float]
    language: str
    language_name: str


class SkippedRow(BaseModel):
    row_index: int
    reason: str


class BatchAnalyzeResponse(BaseModel):
    total_submitted: int
    processed_count: int
    skipped_count: int
    skipped_rows: List[SkippedRow]
    results: List[BatchRecordResult]
    batch_latency_ms: float


class ModelSwitchRequest(BaseModel):
    model_key: str = Field(..., json_schema_extra={"example": "baseline_b"})


class ModelInfoResponse(BaseModel):
    status: Optional[str] = "ready"
    active_model_key: str
    model_name: str
    model_type: str
    model_origin: str
    origin_label: str
    is_uncertainty_enabled: Optional[bool] = True
    uncertainty_threshold: Optional[float] = 0.60
    available_models: List[str]
    classes: List[str]
    supported_languages: Dict[str, Any]
    device: str
    max_sequence_length: int
    version: Optional[str] = "1.1.0"


class AnalyticsResponse(BaseModel):
    dataset_statistics: Optional[Dict[str, Any]] = None
    model_comparison: Optional[Dict[str, Any]] = None
    calibration: Optional[Dict[str, Any]] = None
    error_analysis: Optional[Dict[str, Any]] = None
    translation_experiment: Optional[Dict[str, Any]] = None
    status: str = "success"
