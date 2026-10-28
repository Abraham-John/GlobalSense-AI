"""
GlobalSense AI - Tests for Machine Translation Module
"""

import pytest
from src.translation import translate_to_english, OPUS_MT_MODELS, NOT_SUPPORTED_LANGUAGES


def test_same_language():
    res = translate_to_english("This is an English sentence.", "en")
    assert res["status"] == "same_language"
    assert res["text"] == "This is an English sentence."
    assert res["source_lang"] == "en"
    assert res["latency_ms"] == 0.0


def test_hinglish_not_available():
    res = translate_to_english("Yeh product bilkul bekar hai", "hi-Latn")
    assert res["status"] == "not_available"
    assert res["message"] == "Translation not available for Hinglish"
    assert res["text"] == "Yeh product bilkul bekar hai"


def test_unknown_lang():
    res = translate_to_english("Random text", "xx")
    assert res["status"] == "not_available"
    assert "not available" in res["message"].lower()


def test_result_has_required_keys():
    res = translate_to_english("Testing keys", "en")
    for key in ["text", "source_lang", "model", "latency_ms", "status"]:
        assert key in res


def test_unicode_no_crash():
    # Should not throw unhandled exception even if model isn't downloaded yet
    try:
        res = translate_to_english("नमस्ते दुनिया", "hi")
        assert "status" in res
        assert res["source_lang"] == "hi"
    except Exception as e:
        pytest.fail(f"translate_to_english raised unexpected exception: {e}")


def test_model_error_when_unavailable(monkeypatch):
    import src.translation as trans_mod
    monkeypatch.setattr(trans_mod, "TRANSLATION_AVAILABLE", False)
    res = trans_mod.translate_to_english("Bonjour le monde", "fr")
    assert res["status"] == "model_error"
    assert "installed" in res["message"].lower() or "not installed" in res["message"].lower()
