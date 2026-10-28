"""
GlobalSense AI - Preprocessing and Text Normalization Module
Handles script-sensitive text cleaning, Unicode normalization,
negation preservation, and descriptive text metrics.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Dict, List, Any


# Common negation words across target languages to preserve during tokenization
NEGATION_WORDS = {
    "en": {"not", "no", "never", "none", "neither", "nor", "hardly", "scarcely", "barely", "doesn't", "isn't", "wasn't", "shouldn't", "won't", "can't", "couldn't"},
    "hi": {"नहीं", "ना", "मत", "बिल्कुल नहीं"},
    "hi-Latn": {"nahi", "nhi", "na", "mat", "kabhi nahi", "no"},
    "fr": {"ne", "pas", "jamais", "rien", "aucun", "point", "plus"},
    "es": {"no", "nunca", "jamás", "nadie", "nada", "tampoco"},
    "de": {"nicht", "kein", "keine", "keiner", "keines", "nie", "niemals", "weder"},
    "it": {"non", "mai", "nessuno", "niente", "nulla", "neanche"},
    "pt": {"não", "nunca", "jamais", "nada", "nenhum", "nenhuma", "nem"},
    "ar": {"لا", "لم", "لن", "ليس", "ليست", "غير", "ما"},
    "ja": {"ない", "ず", "ぬ", "ません", "否定"}
}

# Regex to detect distinct script blocks
RE_DEVANAGARI = re.compile(r"[\u0900-\u097F]")
RE_ARABIC = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]")
RE_JAPANESE = re.compile(r"[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]")
RE_LATIN = re.compile(r"[A-Za-z\u00C0-\u024F]")


def normalize_text(text: str) -> str:
    """
    Perform Unicode normalization (NFC), strip invisible/control characters,
    standardize whitespace, while strictly preserving punctuation, diacritics,
    and non-Latin scripts (Devanagari, Arabic, Japanese).
    """
    if not text:
        return ""
    
    # Unicode NFC normalization
    text = unicodedata.normalize("NFC", text)
    
    # Remove zero-width spaces and control characters (except newline/tab)
    text = re.sub(r"[\u200B-\u200D\uFEFF]", "", text)
    text = "".join(ch for ch in text if ch in "\n\t " or not unicodedata.category(ch).startswith("C"))
    
    # Replace multiple whitespace with a single space while keeping linebreaks clean
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n", "\n", text)
    return text.strip()


def detect_dominant_script(text: str) -> str:
    """
    Detect dominant Unicode script block in the text.
    Returns: 'devanagari' | 'arabic' | 'japanese' | 'latin' | 'other'
    """
    counts = {
        "devanagari": len(RE_DEVANAGARI.findall(text)),
        "arabic": len(RE_ARABIC.findall(text)),
        "japanese": len(RE_JAPANESE.findall(text)),
        "latin": len(RE_LATIN.findall(text))
    }
    top_script = max(counts, key=counts.get)
    if counts[top_script] == 0:
        return "other"
    return top_script


def tokenize_words_multilingual(text: str) -> List[str]:
    """
    Script-aware word/token segmentation that keeps words, contractions,
    and individual Japanese ideograms intact without relying on whitespace.
    """
    text = normalize_text(text)
    script = detect_dominant_script(text)
    
    if script == "japanese":
        # For Japanese, if spaces are absent, split into kanji/kana character sequences and latin tokens
        tokens = re.findall(r"[\u4E00-\u9FAF]+|[\u3040-\u309F]+|[\u30A0-\u30FF]+|[A-Za-z0-9]+|[^\s]", text)
        return [t for t in tokens if t.strip()]
    
    # For Latin, Devanagari, Arabic: extract word tokens including diacritics and apostrophes
    tokens = re.findall(r"[\w']+|[^\w\s]", text, re.UNICODE)
    return [t for t in tokens if t.strip()]


def get_text_statistics(text: str) -> Dict[str, Any]:
    """
    Compute descriptive statistics for input text.
    All calculations are independent of sentiment prediction.
    """
    normalized = normalize_text(text)
    words = tokenize_words_multilingual(normalized)
    word_count = len(words)
    char_count = len(normalized)
    
    sentences = [s.strip() for s in re.split(r"[.!?।\u3002]+", normalized) if s.strip()]
    sentence_count = max(len(sentences), 1 if word_count > 0 else 0)
    
    # Filter strictly alphanumeric words for diversity calculation
    lexical_words = [w.lower() for w in words if any(c.isalnum() for c in w)]
    lexical_diversity = round(len(set(lexical_words)) / len(lexical_words), 3) if lexical_words else 0.0
    
    # 200 wpm reading speed
    reading_time_sec = round((word_count / 200) * 60, 1)
    
    dominant_script = detect_dominant_script(normalized)
    
    return {
        "word_count": word_count,
        "char_count": char_count,
        "sentence_count": sentence_count,
        "reading_time_seconds": reading_time_sec,
        "lexical_diversity": lexical_diversity,
        "dominant_script": dominant_script
    }
