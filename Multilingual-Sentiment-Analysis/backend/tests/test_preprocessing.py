"""
Tests for preprocessing and script detection.
"""

import pytest
from src.preprocessing import (
    normalize_text,
    detect_dominant_script,
    tokenize_words_multilingual,
    get_text_statistics,
)


def test_unicode_normalization():
    # Decomposed vs Composed é
    decomposed = "e\u0301"
    composed = "é"
    assert normalize_text(decomposed) == normalize_text(composed)
    assert normalize_text("  hello   world  \n\n ") == "hello world"


def test_script_detection():
    assert detect_dominant_script("यह एक बहुत अच्छी फिल्म है") == "devanagari"
    assert detect_dominant_script("هذا الفيلم رائع جدا") == "arabic"
    assert detect_dominant_script("この映画は素晴らしい") == "japanese"
    assert detect_dominant_script("This movie is amazing") == "latin"


def test_japanese_tokenization():
    text = "映画は素晴らしいです"
    tokens = tokenize_words_multilingual(text)
    assert len(tokens) > 1
    assert "映画" in tokens or "素晴らしい" in tokens or "です" in tokens


def test_text_statistics():
    text = "Great movie! Not boring at all. Loved the acting."
    stats = get_text_statistics(text)
    assert stats["word_count"] > 5
    assert stats["sentence_count"] >= 2
    assert stats["reading_time_seconds"] > 0
    assert stats["dominant_script"] == "latin"
