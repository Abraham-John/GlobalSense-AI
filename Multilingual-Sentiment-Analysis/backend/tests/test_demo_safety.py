"""
Demo Safety Test Suite
Evaluates the active model on tests/demo_sentences.csv (30 native sentences across 10 languages).
Checks response schema and logs every prediction, accuracy, and discrepancy.
"""

import sys
from pathlib import Path
import pandas as pd
import pytest

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from src.prediction import get_prediction_engine
from src.data_loader import CANONICAL_CLASSES

DEMO_CSV_PATH = Path(__file__).resolve().parent / "demo_sentences.csv"


def test_demo_safety_sentences_schema_and_accuracy():
    assert DEMO_CSV_PATH.exists(), f"Missing demo sentences CSV at {DEMO_CSV_PATH}"
    df = pd.read_csv(DEMO_CSV_PATH)
    assert len(df) == 30, f"Expected exactly 30 demo sentences, found {len(df)}"

    engine = get_prediction_engine()
    model_info = engine.get_model_info()
    print("\n" + "=" * 70)
    print(f"RUNNING DEMO SAFETY SUITE on {model_info.get('model_name')}")
    print(f"Active Model Key: {model_info.get('active_model_key')}")
    print("=" * 70)

    correct = 0
    uncertain_count = 0
    discrepancies = []

    for idx, row in df.iterrows():
        text = str(row["text"]).strip()
        expected = str(row["sentiment"]).strip()
        lang_code = str(row["language_code"]).strip()

        # Execute single-sentence analysis
        res = engine.analyze(text, explain=False)

        # 1. Schema assertions
        assert res["sentiment"] in CANONICAL_CLASSES + ["Uncertain"], f"Invalid sentiment: {res['sentiment']}"
        assert "probabilities" in res
        probs = res["probabilities"]
        assert all(c in probs for c in CANONICAL_CLASSES)
        assert abs(sum(probs.values()) - 1.0) < 0.02, f"Probabilities do not sum to ~1.0: {probs}"
        assert 0.0 <= res["confidence"] <= 1.0
        assert "language" in res
        assert "statistics" in res
        assert res["statistics"]["word_count"] > 0

        # Check raw sentiment prediction if uncertain
        raw_pred = res.get("raw_sentiment", res["sentiment"])
        is_match = (raw_pred == expected) or (res["sentiment"] == expected)

        if res["sentiment"] == "Uncertain":
            uncertain_count += 1

        if is_match:
            correct += 1
        else:
            discrepancies.append({
                "index": idx + 1,
                "language": lang_code,
                "expected": expected,
                "predicted": res["sentiment"],
                "raw_pred": raw_pred,
                "confidence": res["confidence"],
                "text": text
            })

    accuracy = correct / len(df)
    print(f"\nDEMO SAFETY RESULTS: {correct}/{len(df)} correct ({accuracy * 100:.1f}%)")
    print(f"Uncertain classifications: {uncertain_count}/{len(df)}")

    if discrepancies:
        print("\nDiscrepancies on demo sheet (Note: 30 sentences is a sanity check, not a formal benchmark):")
        for d in discrepancies:
            print(f" - [{d['language']}] Expected '{d['expected']}', got '{d['predicted']}' (conf={d['confidence']:.3f}): \"{d['text'][:70]}...\"")
    else:
        print("All 30 demo safety sentences predicted correctly!")
    print("=" * 70 + "\n")
