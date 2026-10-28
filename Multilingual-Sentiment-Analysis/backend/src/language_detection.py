"""
GlobalSense AI - Multilingual Language Detection Module
Implements multi-stage language identification using lingua-language-detector,
script detection, and an engineered Hinglish heuristic.
"""

from __future__ import annotations

import os
import re
import sys
from typing import Dict, Any, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lingua import Language, LanguageDetectorBuilder

from src.preprocessing import (
    RE_DEVANAGARI,
    RE_ARABIC,
    RE_JAPANESE,
    RE_LATIN,
    normalize_text,
)

# Supported language catalogue with evaluation thresholds
SUPPORTED_LANGUAGES = {
    "en": {"name": "English", "script": "Latin", "status": "supported", "min_test_samples": 200},
    "hi": {"name": "Hindi", "script": "Devanagari", "status": "supported", "min_test_samples": 200},
    "hi-Latn": {"name": "Hinglish", "script": "Latin (Code-Mixed)", "status": "supported", "min_test_samples": 200},
    "fr": {"name": "French", "script": "Latin", "status": "supported", "min_test_samples": 200},
    "es": {"name": "Spanish", "script": "Latin", "status": "supported", "min_test_samples": 200},
    "de": {"name": "German", "script": "Latin", "status": "supported", "min_test_samples": 200},
    "it": {"name": "Italian", "script": "Latin", "status": "supported", "min_test_samples": 200},
    "pt": {"name": "Portuguese", "script": "Latin", "status": "supported", "min_test_samples": 200},
    "ar": {"name": "Arabic", "script": "Arabic", "status": "supported", "min_test_samples": 200},
    "ja": {"name": "Japanese", "script": "Japanese (Kanji/Kana)", "status": "supported", "min_test_samples": 200},
}

# Mapping Lingua Language enum to our canonical ISO codes
LINGUA_TO_CODE = {
    Language.ENGLISH: "en",
    Language.FRENCH: "fr",
    Language.SPANISH: "es",
    Language.GERMAN: "de",
    Language.ITALIAN: "it",
    Language.PORTUGUESE: "pt",
    Language.ARABIC: "ar",
    Language.JAPANESE: "ja",
    Language.HINDI: "hi",
}

RE_EURO_ACCENTS = re.compile(r"[éèêëàâäçñóíúüößœÉÈÊËÀÂÄÇÑÓÍÚÜÖ]", re.IGNORECASE)

# Strong Hindi grammatical/conversational markers that do not occur in English/French/Spanish
STRONG_HINDI_MARKERS = {
    "hai", "hain", "ho", "hoon", "hun", "tha", "thi", "the", "hoga", "hogi", "hoge",
    "ka", "ki", "ke", "ko", "se", "me", "mein", "pe", "par", "tak", "liye",
    "ye", "yeh", "wo", "woh", "mera", "meri", "mere", "tera", "teri", "tere",
    "apna", "apni", "apne", "hum", "tum", "aap", "kya", "kaun",
    "nahi", "nhi", "na", "mat", "kabhi",
    "kyu", "kyun", "kyunki", "kaha", "kahan", "kab", "kaise",
    "bohot", "bahut", "jyada", "thoda", "kuch", "yaar", "bhai",
    "accha", "acchi", "achha", "achhi", "bura", "buri", "mast",
    "zabardast", "bekar", "bakwas", "dekho", "dekha", "raha", "rahi", "rahe"
}


class MultilingualLanguageDetector:
    """
    Tiered language detection:
    1. Unicode script classification (Devanagari, Arabic, Japanese)
    2. Hinglish Roman-script lexical heuristic
    3. Lingua statistical n-gram language detector for Latin & general text
    """

    def __init__(self):
        target_lingua_langs = list(LINGUA_TO_CODE.keys())
        self.detector = (
            LanguageDetectorBuilder.from_languages(*target_lingua_langs)
            .build()
        )

    def detect_hinglish(self, text: str) -> tuple[bool, float]:
        """
        Check if Latin text is code-mixed Hindi (Hinglish) using lexical coverage.
        Disqualifies European accented text and requires genuine Hindi markers.
        """
        # If text contains French/Spanish/German accents, it's not Hinglish
        if RE_EURO_ACCENTS.search(text):
            return False, 0.0

        words = re.findall(r"[a-zA-Z]+", text.lower())
        if not words:
            return False, 0.0

        strong_matches = sum(1 for w in words if w in STRONG_HINDI_MARKERS)
        ratio = strong_matches / len(words)

        # Requires at least 2 strong Hindi markers, or short text with at least 1 strong marker and >= 30% ratio
        if (strong_matches >= 2 and ratio >= 0.15) or (len(words) <= 5 and strong_matches >= 1 and ratio >= 0.25):
            conf = min(0.98, max(0.65, 0.50 + ratio * 0.50))
            return True, round(conf, 3)

        return False, 0.0

    def detect(self, text: str, override_language: Optional[str] = None) -> Dict[str, Any]:
        """
        Detect language of input text with confidence score.
        If override_language is provided and valid, respect it with 1.0 confidence.
        """
        if override_language and override_language in SUPPORTED_LANGUAGES:
            meta = SUPPORTED_LANGUAGES[override_language]
            return {
                "language_code": override_language,
                "language_name": meta["name"],
                "script": meta["script"],
                "confidence": 1.0,
                "status": meta["status"],
                "is_override": True,
            }

        normalized = normalize_text(text)
        if not normalized:
            return {
                "language_code": "en",
                "language_name": "English",
                "script": "Latin",
                "confidence": 0.0,
                "status": "supported",
                "is_override": False,
            }

        # Step 1: Script-level definitive checks
        dev_matches = len(RE_DEVANAGARI.findall(normalized))
        ar_matches = len(RE_ARABIC.findall(normalized))
        ja_matches = len(RE_JAPANESE.findall(normalized))

        total_chars = max(len(normalized.replace(" ", "")), 1)

        if dev_matches / total_chars > 0.2:
            return {
                "language_code": "hi",
                "language_name": SUPPORTED_LANGUAGES["hi"]["name"],
                "script": "Devanagari",
                "confidence": min(0.99, round(0.70 + (dev_matches / total_chars) * 0.30, 3)),
                "status": SUPPORTED_LANGUAGES["hi"]["status"],
                "is_override": False,
            }

        if ar_matches / total_chars > 0.2:
            return {
                "language_code": "ar",
                "language_name": SUPPORTED_LANGUAGES["ar"]["name"],
                "script": "Arabic",
                "confidence": min(0.99, round(0.70 + (ar_matches / total_chars) * 0.30, 3)),
                "status": SUPPORTED_LANGUAGES["ar"]["status"],
                "is_override": False,
            }

        if ja_matches / total_chars > 0.15:
            return {
                "language_code": "ja",
                "language_name": SUPPORTED_LANGUAGES["ja"]["name"],
                "script": "Japanese (Kanji/Kana)",
                "confidence": min(0.99, round(0.70 + (ja_matches / total_chars) * 0.30, 3)),
                "status": SUPPORTED_LANGUAGES["ja"]["status"],
                "is_override": False,
            }

        # Step 2: Hinglish heuristic on Latin text
        is_hinglish, h_conf = self.detect_hinglish(normalized)
        if is_hinglish:
            return {
                "language_code": "hi-Latn",
                "language_name": SUPPORTED_LANGUAGES["hi-Latn"]["name"],
                "script": "Latin (Code-Mixed)",
                "confidence": h_conf,
                "status": SUPPORTED_LANGUAGES["hi-Latn"]["status"],
                "is_override": False,
            }

        # Step 3: Statistical detection via Lingua
        lingua_res = self.detector.detect_language_of(normalized)
        conf_values = self.detector.compute_language_confidence_values(normalized)

        if lingua_res in LINGUA_TO_CODE:
            code = LINGUA_TO_CODE[lingua_res]
            top_conf = 0.85
            if conf_values and conf_values[0].language == lingua_res:
                top_conf = round(conf_values[0].value, 3)

            meta = SUPPORTED_LANGUAGES.get(code, {"name": lingua_res.name.title(), "script": "Latin", "status": "supported"})
            return {
                "language_code": code,
                "language_name": meta["name"],
                "script": meta["script"],
                "confidence": top_conf,
                "status": meta.get("status", "supported"),
                "is_override": False,
            }

        # Default fallback
        return {
            "language_code": "en",
            "language_name": "English",
            "script": "Latin",
            "confidence": 0.5,
            "status": "supported",
            "is_override": False,
        }


# Singleton instance
_detector_instance: Optional[MultilingualLanguageDetector] = None

def get_language_detector() -> MultilingualLanguageDetector:
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = MultilingualLanguageDetector()
    return _detector_instance
