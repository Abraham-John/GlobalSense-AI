"""
GlobalSense AI - Machine Translation Engine (Lazy, Cached, Helsinki-NLP opus-mt)
Provides fast, CPU-friendly machine translation to English for supported languages.
Original text is preserved for primary sentiment analysis; translation is auxiliary.
"""

from __future__ import annotations

import hashlib
import logging
import time
from typing import Dict, Any, Optional

logger = logging.getLogger("globalsense.translation")

# Helsinki-NLP Opus-MT models verified on HuggingFace Hub
OPUS_MT_MODELS: Dict[str, str] = {
    "fr": "Helsinki-NLP/opus-mt-fr-en",
    "es": "Helsinki-NLP/opus-mt-es-en",
    "de": "Helsinki-NLP/opus-mt-de-en",
    "it": "Helsinki-NLP/opus-mt-it-en",
    "pt": "Helsinki-NLP/opus-mt-ROMANCE-en",  # Helsinki-NLP has no dedicated opus-mt-pt-en; opus-mt-ROMANCE-en is official Romance-to-English model covering Portuguese
    "ar": "Helsinki-NLP/opus-mt-ar-en",
    "ja": "Helsinki-NLP/opus-mt-ja-en",
    "hi": "Helsinki-NLP/opus-mt-hi-en",
}

# Explicitly unsupported languages with friendly user messages
NOT_SUPPORTED_LANGUAGES: Dict[str, str] = {
    "hi-Latn": "Translation not available for Hinglish",
}

# Runtime model cache, translation memory cache, and failed load tracking
LOADED_MODELS: Dict[str, Dict[str, Any]] = {}
TRANSLATION_CACHE: Dict[tuple, Dict[str, Any]] = {}
FAILED_MODELS: Dict[str, str] = {}

try:
    import torch
    from transformers import MarianMTModel, MarianTokenizer
    TRANSLATION_AVAILABLE = True
except ImportError:
    torch = None
    MarianMTModel = None
    MarianTokenizer = None
    TRANSLATION_AVAILABLE = False


def _load_model(lang: str, local_model_dir: Optional[str] = None):
    """
    Lazy-load MarianMT tokenizer and model on first use.
    Caches in LOADED_MODELS.
    """
    if lang in LOADED_MODELS:
        return LOADED_MODELS[lang]

    model_id = OPUS_MT_MODELS.get(lang)
    if not model_id:
        raise ValueError(f"No translation model defined for language '{lang}'")

    # If local_model_dir has a pre-downloaded folder, prefer it
    target_path = model_id
    if local_model_dir:
        from pathlib import Path
        local_path = Path(local_model_dir) / lang
        if local_path.exists():
            target_path = str(local_path)

    logger.info(f"Loading translation model for {lang} from {target_path}...")
    tokenizer = MarianTokenizer.from_pretrained(target_path)
    model = MarianMTModel.from_pretrained(target_path)
    model.eval()

    LOADED_MODELS[lang] = {
        "tokenizer": tokenizer,
        "model": model,
        "model_id": model_id,
    }
    return LOADED_MODELS[lang]


def translate_to_english(
    text: str,
    source_lang: str,
    local_model_dir: Optional[str] = None
) -> Dict[str, Any]:
    """
    Translate text from source_lang to English.
    Returns a dictionary matching the TranslationResult schema:
    {
        "text": str,
        "source_lang": str,
        "model": str,
        "latency_ms": float,
        "status": str,  # 'success' | 'same_language' | 'not_available' | 'model_error'
        "message": Optional[str]
    }
    """
    if not text or not text.strip():
        return {
            "text": text,
            "source_lang": source_lang,
            "model": "none",
            "latency_ms": 0.0,
            "status": "same_language" if source_lang == "en" else "not_available",
            "message": "Empty text provided"
        }

    # 1. English is already target language
    if source_lang == "en":
        return {
            "text": text,
            "source_lang": "en",
            "model": "none",
            "latency_ms": 0.0,
            "status": "same_language",
            "message": "Text is already in English"
        }

    # 2. Check if explicitly unsupported (e.g. Hinglish)
    if source_lang in NOT_SUPPORTED_LANGUAGES:
        return {
            "text": text,
            "source_lang": source_lang,
            "model": "none",
            "latency_ms": 0.0,
            "status": "not_available",
            "message": NOT_SUPPORTED_LANGUAGES[source_lang]
        }

    # 3. Check if language has an opus-mt model
    if source_lang not in OPUS_MT_MODELS:
        return {
            "text": text,
            "source_lang": source_lang,
            "model": "none",
            "latency_ms": 0.0,
            "status": "not_available",
            "message": f"Translation model not available for language code: {source_lang}"
        }

    # 4. Check dependencies
    if not TRANSLATION_AVAILABLE:
        return {
            "text": text,
            "source_lang": source_lang,
            "model": OPUS_MT_MODELS.get(source_lang, "unknown"),
            "latency_ms": 0.0,
            "status": "model_error",
            "message": "PyTorch or HuggingFace transformers is not installed in backend environment"
        }

    # 5. Check failed model tracking
    if source_lang in FAILED_MODELS:
        return {
            "text": text,
            "source_lang": source_lang,
            "model": OPUS_MT_MODELS.get(source_lang, "unknown"),
            "latency_ms": 0.0,
            "status": "model_error",
            "message": FAILED_MODELS[source_lang]
        }

    # 6. Check in-memory cache
    text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
    cache_key = (text_hash, source_lang)
    if cache_key in TRANSLATION_CACHE:
        cached = dict(TRANSLATION_CACHE[cache_key])
        cached["latency_ms"] = 0.5  # Cache hit latency
        return cached

    # 7. Perform translation
    start_time = time.perf_counter()
    try:
        model_bundle = _load_model(source_lang, local_model_dir=local_model_dir)
        tokenizer = model_bundle["tokenizer"]
        model = model_bundle["model"]
        model_id = model_bundle["model_id"]

        inputs = tokenizer(
            [text],
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=256
        )

        with torch.no_grad():
            # num_beams=2: balances translation quality and latency on CPU.
            # Greedy search (num_beams=1) degrades fluency on idiomatic phrases,
            # while num_beams>=4 doubles latency without significant BLEU gains.
            translated_tokens = model.generate(
                **inputs,
                max_length=256,
                num_beams=2,
                early_stopping=True
            )

        translated_text = tokenizer.decode(translated_tokens[0], skip_special_tokens=True)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        result = {
            "text": translated_text,
            "source_lang": source_lang,
            "model": model_id,
            "latency_ms": elapsed_ms,
            "status": "success",
            "message": None
        }

        TRANSLATION_CACHE[cache_key] = result
        return result

    except Exception as e:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.warning(f"Translation failed for {source_lang}: {e}")
        FAILED_MODELS[source_lang] = str(e)
        return {
            "text": text,
            "source_lang": source_lang,
            "model": OPUS_MT_MODELS.get(source_lang, "unknown"),
            "latency_ms": elapsed_ms,
            "status": "model_error",
            "message": str(e)
        }
