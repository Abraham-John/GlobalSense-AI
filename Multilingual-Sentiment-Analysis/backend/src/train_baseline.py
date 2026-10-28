"""
GlobalSense AI - Baseline Training & Evaluation Module
Trains and benchmarks Baseline A (Word TF-IDF + Logistic Regression)
and Baseline B (Word + Char n-gram TF-IDF + Logistic Regression) under identical held-out test protocol.
"""

from __future__ import annotations

import json
import os
import sys
import time
from typing import Dict, Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.pipeline import FeatureUnion, Pipeline

from src.data_loader import CANONICAL_CLASSES, LABEL_TO_ID, TARGET_LANGUAGES
from src.preprocessing import normalize_text


def build_baseline_a_pipeline() -> Pipeline:
    """Baseline A: Standard word TF-IDF + Logistic Regression."""
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 1),
            sublinear_tf=True,
            max_features=25000,
            token_pattern=r"(?u)\b\w+\b",
        )),
        ("clf", LogisticRegression(
            C=1.0,
            max_iter=1000,
            class_weight="balanced",
            random_state=42,
            solver="lbfgs"
        ))
    ])


def build_baseline_b_pipeline() -> Pipeline:
    """
    Baseline B: Multilingual-aware Word + Character n-gram TF-IDF + Logistic Regression.
    Preserves subwords, negation, diacritics, and morphologically rich scripts.
    """
    features = FeatureUnion([
        ("word_tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            max_features=30000,
            token_pattern=r"(?u)\b\w+\b"
        )),
        ("char_tfidf", TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(2, 5),
            sublinear_tf=True,
            max_features=40000,
            min_df=2
        ))
    ])

    return Pipeline([
        ("features", features),
        ("clf", LogisticRegression(
            C=1.5,
            max_iter=1000,
            class_weight="balanced",
            random_state=42,
            solver="lbfgs"
        ))
    ])


def evaluate_pipeline(
    name: str,
    pipeline: Pipeline,
    test_df: pd.DataFrame
) -> Dict[str, Any]:
    """Evaluate pipeline on the held-out test set with per-language breakdown and CPU latency benchmark."""
    print(f"\nEvaluating {name} on {len(test_df)} held-out test samples...")
    X_test = test_df["text"].fillna("").tolist()
    y_true_str = test_df["label"].tolist()
    y_true = np.array([LABEL_TO_ID[l] for l in y_true_str])

    # Latency benchmark
    t0 = time.perf_counter()
    y_pred_probs = pipeline.predict_proba(X_test)
    total_time_sec = time.perf_counter() - t0
    latency_ms_per_sample = round((total_time_sec / len(X_test)) * 1000, 3)

    y_pred = np.argmax(y_pred_probs, axis=1)

    acc = round(accuracy_score(y_true, y_pred), 4)
    macro_f1 = round(f1_score(y_true, y_pred, average="macro"), 4)
    weighted_f1 = round(f1_score(y_true, y_pred, average="weighted"), 4)
    precision_macro = round(precision_score(y_true, y_pred, average="macro"), 4)
    recall_macro = round(recall_score(y_true, y_pred, average="macro"), 4)

    # Per-class metrics
    class_report = classification_report(
        y_true,
        y_pred,
        target_names=CANONICAL_CLASSES,
        output_dict=True
    )
    per_class_f1 = {
        cls_name: round(class_report[cls_name]["f1-score"], 4)
        for cls_name in CANONICAL_CLASSES
    }

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1, 2]).tolist()

    # Per-language breakdown
    per_language: Dict[str, Any] = {}
    for lang in TARGET_LANGUAGES:
        mask = (test_df["language"] == lang).to_numpy()
        if np.sum(mask) == 0:
            continue
        lang_true = y_true[mask]
        lang_pred = y_pred[mask]
        per_language[lang] = {
            "samples": int(np.sum(mask)),
            "accuracy": round(accuracy_score(lang_true, lang_pred), 4),
            "macro_f1": round(f1_score(lang_true, lang_pred, average="macro", zero_division=0), 4),
            "precision_macro": round(precision_score(lang_true, lang_pred, average="macro", zero_division=0), 4),
            "recall_macro": round(recall_score(lang_true, lang_pred, average="macro", zero_division=0), 4),
        }

    return {
        "model_name": name,
        "overall": {
            "accuracy": acc,
            "macro_f1": macro_f1,
            "weighted_f1": weighted_f1,
            "precision_macro": precision_macro,
            "recall_macro": recall_macro,
            "latency_ms_per_sample": latency_ms_per_sample,
            "test_sample_count": len(test_df)
        },
        "per_class_f1": per_class_f1,
        "confusion_matrix": {
            "labels": CANONICAL_CLASSES,
            "matrix": cm
        },
        "per_language": per_language
    }


def train_and_evaluate_baselines(
    data_dir: str = "dataset/processed",
    models_dir: str = "models",
    results_dir: str = "results/outputs"
) -> Dict[str, Any]:
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(results_dir, exist_ok=True)

    train_path = os.path.join(data_dir, "train.csv")
    test_path = os.path.join(data_dir, "test.csv")

    print(f"[Baseline] Loading train data from {train_path}...")
    train_df = pd.read_csv(train_path)
    test_df = pd.read_csv(test_path)

    X_train = train_df["text"].fillna("").tolist()
    y_train = np.array([LABEL_TO_ID[l] for l in train_df["label"].tolist()])

    # 1. Train Baseline A
    print("\n--- Training Baseline A: Word TF-IDF + Logistic Regression ---")
    pipe_a = build_baseline_a_pipeline()
    t0 = time.time()
    pipe_a.fit(X_train, y_train)
    train_time_a = round(time.time() - t0, 2)
    print(f"Baseline A trained in {train_time_a}s.")

    model_a_path = os.path.join(models_dir, "baseline_a.joblib")
    joblib.dump(pipe_a, model_a_path)
    print(f"Saved Baseline A model to {model_a_path}")

    res_a = evaluate_pipeline("Baseline A (Word TF-IDF + Logistic Regression)", pipe_a, test_df)
    res_a["overall"]["train_time_sec"] = train_time_a

    res_a_path = os.path.join(results_dir, "baseline_a_results.json")
    with open(res_a_path, "w", encoding="utf-8") as f:
        json.dump(res_a, f, indent=2)

    # 2. Train Baseline B
    print("\n--- Training Baseline B: Word + Char n-gram TF-IDF + Logistic Regression ---")
    pipe_b = build_baseline_b_pipeline()
    t0 = time.time()
    pipe_b.fit(X_train, y_train)
    train_time_b = round(time.time() - t0, 2)
    print(f"Baseline B trained in {train_time_b}s.")

    model_b_path = os.path.join(models_dir, "baseline_b.joblib")
    joblib.dump(pipe_b, model_b_path)
    print(f"Saved Baseline B model to {model_b_path}")

    res_b = evaluate_pipeline("Baseline B (Word+Char n-gram TF-IDF + Logistic Regression)", pipe_b, test_df)
    res_b["overall"]["train_time_sec"] = train_time_b

    res_b_path = os.path.join(results_dir, "baseline_b_results.json")
    with open(res_b_path, "w", encoding="utf-8") as f:
        json.dump(res_b, f, indent=2)

    print("\n================== SUMMARY ==================")
    print(f"Baseline A Macro F1: {res_a['overall']['macro_f1']} (Accuracy: {res_a['overall']['accuracy']}, Latency: {res_a['overall']['latency_ms_per_sample']}ms)")
    print(f"Baseline B Macro F1: {res_b['overall']['macro_f1']} (Accuracy: {res_b['overall']['accuracy']}, Latency: {res_b['overall']['latency_ms_per_sample']}ms)")
    print("=============================================")

    return {"baseline_a": res_a, "baseline_b": res_b}


if __name__ == "__main__":
    train_and_evaluate_baselines()
