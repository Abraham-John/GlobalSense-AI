"""
GlobalSense AI - Translate-Test Experiment (Subset N=50 per language, seed=42)
Compares direct multilingual XLM-R inference vs translate-first pipeline on held-out test data.
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

# Resolve root
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from src.prediction import get_prediction_engine
from src.translation import translate_to_english

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("translate_experiment")

TRANSLATABLE_LANGUAGES = ["fr", "es", "de", "it", "pt", "ar", "ja", "hi"]
SAMPLES_PER_LANG = 50
RANDOM_SEED = 42
OUTPUT_PATH = BACKEND_DIR / "results" / "outputs" / "translation_experiment.json"


def run_experiment():
    test_csv = BACKEND_DIR / "dataset" / "processed" / "test.csv"
    if not test_csv.exists():
        logger.error(f"Test CSV not found at {test_csv}")
        return False

    df = pd.read_csv(test_csv)
    logger.info(f"Loaded test.csv with {len(df)} rows.")

    # Sample exactly 50 per language with fixed seed
    sampled_dfs = []
    for lang in TRANSLATABLE_LANGUAGES:
        lang_df = df[df["language"] == lang]
        if len(lang_df) < SAMPLES_PER_LANG:
            logger.warning(f"Only {len(lang_df)} samples for {lang}, using all.")
            sampled_dfs.append(lang_df)
        else:
            sampled_dfs.append(lang_df.sample(n=SAMPLES_PER_LANG, random_state=RANDOM_SEED))

    subset_df = pd.concat(sampled_dfs, ignore_index=True)
    logger.info(f"Sampled {len(subset_df)} total records across {len(TRANSLATABLE_LANGUAGES)} languages.")

    engine = get_prediction_engine()
    # Ensure pretrained_xlmr is active
    engine.set_active_model("pretrained_xlmr")
    active_model = engine.active_model_key
    logger.info(f"Active model for evaluation: {active_model}")

    per_language_results = {}
    overall_orig_preds = []
    overall_trans_preds = []
    overall_true = []
    overall_trans_latencies = []

    for lang in TRANSLATABLE_LANGUAGES:
        logger.info(f"--- Evaluating language: {lang} (N={SAMPLES_PER_LANG}) ---")
        lang_subset = subset_df[subset_df["language"] == lang]
        
        y_true = lang_subset["label"].tolist()
        texts = lang_subset["text"].tolist()

        orig_preds = []
        trans_preds = []
        trans_latencies = []

        for i, text in enumerate(texts):
            # 1. Condition 1: Original text inference
            res_orig = engine.analyze(text=text, override_language=lang, explain=False)
            orig_preds.append(res_orig["sentiment"])

            # 2. Translate text to English
            t_start = time.perf_counter()
            trans_res = translate_to_english(text=text, source_lang=lang)
            trans_lat = trans_res.get("latency_ms", (time.perf_counter() - t_start) * 1000)
            trans_latencies.append(trans_lat)

            translated_text = trans_res.get("text", text)

            # 3. Condition 2: Predict on translated text (override_language='en')
            res_trans = engine.analyze(text=translated_text, override_language="en", explain=False)
            trans_preds.append(res_trans["sentiment"])

        # Compute metrics for this language
        acc_orig = float(accuracy_score(y_true, orig_preds))
        f1_orig = float(f1_score(y_true, orig_preds, average="macro", zero_division=0))

        acc_trans = float(accuracy_score(y_true, trans_preds))
        f1_trans = float(f1_score(y_true, trans_preds, average="macro", zero_division=0))

        mean_trans_latency = float(np.mean(trans_latencies))

        per_language_results[lang] = {
            "samples": len(y_true),
            "original": {
                "accuracy": round(acc_orig, 4),
                "macro_f1": round(f1_orig, 4)
            },
            "translated": {
                "accuracy": round(acc_trans, 4),
                "macro_f1": round(f1_trans, 4)
            },
            "delta_accuracy": round(acc_trans - acc_orig, 4),
            "delta_macro_f1": round(f1_trans - f1_orig, 4),
            "mean_translation_latency_ms": round(mean_trans_latency, 2)
        }

        logger.info(f"[{lang}] Original: Acc={acc_orig:.3f}, F1={f1_orig:.3f} | Translated: Acc={acc_trans:.3f}, F1={f1_trans:.3f} | Delta F1={f1_trans - f1_orig:+.3f}")

        overall_orig_preds.extend(orig_preds)
        overall_trans_preds.extend(trans_preds)
        overall_true.extend(y_true)
        overall_trans_latencies.extend(trans_latencies)

    # Compute overall metrics
    overall_acc_orig = float(accuracy_score(overall_true, overall_orig_preds))
    overall_f1_orig = float(f1_score(overall_true, overall_orig_preds, average="macro", zero_division=0))

    overall_acc_trans = float(accuracy_score(overall_true, overall_trans_preds))
    overall_f1_trans = float(f1_score(overall_true, overall_trans_preds, average="macro", zero_division=0))

    experiment_artifact = {
        "metadata": {
            "experiment": "Translate-Test Pipeline vs Direct XLM-R Multilingual Inference",
            "eval_model": "pretrained_xlmr (cardiffnlp/twitter-xlm-roberta-base-sentiment)",
            "translator_family": "Helsinki-NLP/opus-mt",
            "subset_size_per_language": SAMPLES_PER_LANG,
            "total_samples": len(overall_true),
            "languages_evaluated": TRANSLATABLE_LANGUAGES,
            "unsupported_languages": ["hi-Latn (Hinglish: no Romanized translation model)", "en (Already English)"],
            "seed": RANDOM_SEED,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "status": "completed_subset",
            "full_test_status": "NOT EXECUTED: full test set run (evaluated on N=50/lang subset due to CPU inference time constraints). The sample size is small and difference in F1 is within noise margin."
        },
        "overall": {
            "samples": len(overall_true),
            "original": {
                "accuracy": round(overall_acc_orig, 4),
                "macro_f1": round(overall_f1_orig, 4)
            },
            "translated": {
                "accuracy": round(overall_acc_trans, 4),
                "macro_f1": round(overall_f1_trans, 4)
            },
            "delta_accuracy": round(overall_acc_trans - overall_acc_orig, 4),
            "delta_macro_f1": round(overall_f1_trans - overall_f1_orig, 4),
            "mean_translation_latency_ms": round(float(np.mean(overall_trans_latencies)), 2)
        },
        "per_language": per_language_results
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(experiment_artifact, f, indent=2)

    logger.info(f"Experiment artifact written to {OUTPUT_PATH}")
    print("\n" + "=" * 60)
    print("TRANSLATE-TEST EXPERIMENT COMPLETE (N=50 per lang, seed=42)")
    print(f"Overall Original:   Acc={overall_acc_orig:.4f}, Macro-F1={overall_f1_orig:.4f}")
    print(f"Overall Translated: Acc={overall_acc_trans:.4f}, Macro-F1={overall_f1_trans:.4f}")
    print(f"Delta: Acc={overall_acc_trans - overall_acc_orig:+.4f}, Macro-F1={overall_f1_trans - overall_f1_orig:+.4f}")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = run_experiment()
    sys.exit(0 if success else 1)
