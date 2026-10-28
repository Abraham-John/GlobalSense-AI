"""
Tests for multilingual language detection and Hinglish heuristic.
"""

import pytest
from src.language_detection import get_language_detector, SUPPORTED_LANGUAGES


@pytest.fixture
def detector():
    return get_language_detector()


def test_supported_languages_catalogue():
    assert "en" in SUPPORTED_LANGUAGES
    assert "hi" in SUPPORTED_LANGUAGES
    assert "hi-Latn" in SUPPORTED_LANGUAGES
    assert "ja" in SUPPORTED_LANGUAGES
    assert "ar" in SUPPORTED_LANGUAGES


def test_devanagari_detection(detector):
    res = detector.detect("यह फिल्म बहुत ही सुंदर और प्रेरणादायक है")
    assert res["language_code"] == "hi"
    assert res["script"] == "Devanagari"
    assert res["confidence"] >= 0.70


def test_arabic_detection(detector):
    res = detector.detect("هذا الفيلم رائع ومؤثر للغاية")
    assert res["language_code"] == "ar"
    assert res["script"] == "Arabic"
    assert res["confidence"] >= 0.70


def test_japanese_detection(detector):
    res = detector.detect("この作品は本当に感動的で素晴らしかった")
    assert res["language_code"] == "ja"
    assert "Japanese" in res["script"]
    assert res["confidence"] >= 0.70


def test_hinglish_detection(detector):
    res = detector.detect("bhai ye movie sach me bohot acchi thi yaar maza aa gaya")
    assert res["language_code"] == "hi-Latn"
    assert res["confidence"] >= 0.65


def test_european_languages(detector):
    res_fr = detector.detect("Ce film est un chef-d'œuvre absolu du cinéma")
    assert res_fr["language_code"] == "fr"

    res_es = detector.detect("Esta película es una obra maestra increíble")
    assert res_es["language_code"] == "es"

    res_de = detector.detect("Dieser Film ist ein absolutes Meisterwerk des Kinos")
    assert res_de["language_code"] == "de"


def test_language_override(detector):
    res = detector.detect("Hello world", override_language="ja")
    assert res["language_code"] == "ja"
    assert res["is_override"] is True
    assert res["confidence"] == 1.0
