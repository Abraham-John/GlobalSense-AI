"""
GlobalSense AI - Comprehensive Evaluation, Calibration & Error Analysis Module
Evaluates all available models under identical held-out test protocol,
computes Expected Calibration Error (ECE), aggregates error analysis,
and generates publication-grade visualizations.
"""

from __future__ import annotations

import json
import os
import sys
import time
from typing import Dict, List, Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, confusion_matrix

from src.data_loader import CANONICAL_CLASSES, LABEL_TO_ID, ID_TO_LABEL, TARGET_LANGUAGES
from src.prediction import get_prediction_engine


def compute_expected_calibration_error(
    confidences: np.ndarray,
    predictions: np.ndarray,
    ground_truth: np.ndarray,
    num_bins: int = 10
) -> Dict[str, Any]:
    """
    Computes Expected Calibration Error (ECE) and binned reliability data.
    ECE = sum_b (|B_b| / N) * |acc(B_b) - conf(B_b)|
    """
    bin_boundaries = np.linspace(0.0, 1.0, num_bins + 1)
    ece = 0.0
    bins_data = []

    for i in range(num_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]
        mask = (confidences > bin_lower) & (confidences <= bin_upper)
        bin_size = int(np.sum(mask))

        if bin_size > 0:
            bin_acc = float(np.mean(predictions[mask] == ground_truth[mask]))
            bin_conf = float(np.mean(confidences[mask]))
            weight = bin_size / len(confidences)
            ece += weight * abs(bin_acc - bin_conf)

            bins_data.append({
                "bin_index": i,
                "range": [round(float(bin_lower), 2), round(float(bin_upper), 2)],
                "samples": bin_size,
                "accuracy": round(bin_acc, 4),
                "confidence": round(bin_conf, 4),
                "calibration_gap": round(abs(bin_acc - bin_conf), 4)
            })
        else:
            bins_data.append({
                "bin_index": i,
                "range": [round(float(bin_lower), 2), round(float(bin_upper), 2)],
                "samples": 0,
                "accuracy": 0.0,
                "confidence": round(float((bin_lower + bin_upper) / 2), 2),
                "calibration_gap": 0.0
            })

    return {
        "ece": round(float(ece), 4),
        "num_bins": num_bins,
        "bins": bins_data
    }


def run_full_evaluation_suite(
    data_dir: str = "dataset/processed",
    results_dir: str = "results/outputs",
    graphs_dir: str = "results/graphs"
) -> Dict[str, Any]:
    os.makedirs(results_dir, exist_ok=True)
    os.makedirs(graphs_dir, exist_ok=True)

    test_path = os.path.join(data_dir, "test.csv")
    test_df = pd.read_csv(test_path)
    print(f"[Evaluation] Loaded {len(test_df)} held-out test records.")

    engine = get_prediction_engine()
    available_models = engine.loaded_models

    model_evaluations: Dict[str, Any] = {}
    error_analysis_samples: List[Dict[str, Any]] = []

    y_true = np.array([LABEL_TO_ID[l] for l in test_df["label"].tolist()])
    texts = test_df["text"].fillna("").tolist()

    for mkey in ["baseline_a", "baseline_b", "bilstm"]:
        if mkey not in available_models:
            continue

        print(f"\n[Evaluation] Evaluating model '{mkey}'...")
        engine.set_active_model(mkey)
        model_meta = available_models[mkey]

        t0 = time.perf_counter()
        probs = engine._predict_probabilities_batch(texts)
        total_sec = time.perf_counter() - t0
        latency_ms = round((total_sec / len(texts)) * 1000, 3)

        preds = np.argmax(probs, axis=1)
        confs = np.max(probs, axis=1)

        acc = round(accuracy_score(y_true, preds), 4)
        macro_f1 = round(f1_score(y_true, preds, average="macro", zero_division=0), 4)
        weighted_f1 = round(f1_score(y_true, preds, average="weighted", zero_division=0), 4)
        prec = round(precision_score(y_true, preds, average="macro", zero_division=0), 4)
        rec = round(recall_score(y_true, preds, average="macro", zero_division=0), 4)

        # Calibration
        calibration = compute_expected_calibration_error(confs, preds, y_true)

        # Confusion Matrix
        cm = confusion_matrix(y_true, preds, labels=[0, 1, 2]).tolist()

        # Per-language
        per_lang = {}
        for lang in TARGET_LANGUAGES:
            mask = (test_df["language"] == lang).to_numpy()
            if np.sum(mask) == 0:
                continue
            l_true = y_true[mask]
            l_pred = preds[mask]
            per_lang[lang] = {
                "samples": int(np.sum(mask)),
                "accuracy": round(accuracy_score(l_true, l_pred), 4),
                "macro_f1": round(f1_score(l_true, l_pred, average="macro", zero_division=0), 4)
            }

        model_evaluations[mkey] = {
            "key": mkey,
            "name": model_meta["name"],
            "type": model_meta["type"],
            "origin": model_meta["origin"],
            "origin_label": model_meta["label"],
            "overall": {
                "accuracy": acc,
                "macro_f1": macro_f1,
                "weighted_f1": weighted_f1,
                "precision_macro": prec,
                "recall_macro": rec,
                "latency_ms_per_sample": latency_ms,
                "ece": calibration["ece"]
            },
            "per_language": per_lang,
            "confusion_matrix": {
                "labels": CANONICAL_CLASSES,
                "matrix": cm
            },
            "calibration": calibration
        }

        # Collect misclassified samples for error analysis (from baseline_b)
        if mkey == "baseline_b":
            mismatches = np.where(preds != y_true)[0]
            # Sample up to 20 realistic error cases across languages
            for idx in mismatches[:25]:
                error_analysis_samples.append({
                    "text": texts[idx],
                    "language": test_df.iloc[idx]["language"],
                    "ground_truth": ID_TO_LABEL[y_true[idx]],
                    "predicted": ID_TO_LABEL[preds[idx]],
                    "confidence": round(float(confs[idx]), 4),
                    "probabilities": {
                        "Positive": round(float(probs[idx][0]), 4),
                        "Negative": round(float(probs[idx][1]), 4),
                        "Neutral": round(float(probs[idx][2]), 4)
                    }
                })

    # Save model comparison summary
    comparison_path = os.path.join(results_dir, "model_comparison.json")
    with open(comparison_path, "w", encoding="utf-8") as f:
        json.dump(model_evaluations, f, indent=2)

    # Save error analysis
    error_path = os.path.join(results_dir, "error_analysis.json")
    with open(error_path, "w", encoding="utf-8") as f:
        json.dump({
            "total_errors_analyzed": len(error_analysis_samples),
            "samples": error_analysis_samples
        }, f, indent=2, ensure_ascii=False)

    # Save calibration report for best model
    calib_path = os.path.join(results_dir, "calibration.json")
    if "baseline_b" in model_evaluations:
        with open(calib_path, "w", encoding="utf-8") as f:
            json.dump(model_evaluations["baseline_b"]["calibration"], f, indent=2)

    # Plot Confusion Matrix Heatmap for Baseline B
    if "baseline_b" in model_evaluations:
        cm_matrix = np.array(model_evaluations["baseline_b"]["confusion_matrix"]["matrix"])
        plt.figure(figsize=(6, 5))
        sns.heatmap(
            cm_matrix,
            annot=True,
            fmt="d",
            cmap="Blues",
            xticklabels=CANONICAL_CLASSES,
            yticklabels=CANONICAL_CLASSES
        )
        plt.title("Baseline B Confusion Matrix (Test Set)")
        plt.ylabel("Ground Truth")
        plt.xlabel("Predicted Sentiment")
        plt.tight_layout()
        cm_plot_path = os.path.join(graphs_dir, "confusion_matrix.png")
        plt.savefig(cm_plot_path, dpi=300)
        plt.close()
        print(f"[Evaluation] Saved confusion matrix heatmap to {cm_plot_path}")

    # Plot Model Comparison Bar Chart
    plt.figure(figsize=(8, 4.5))
    model_names = [m["name"].split("(")[0].strip() for m in model_evaluations.values()]
    f1_scores = [m["overall"]["macro_f1"] for m in model_evaluations.values()]
    acc_scores = [m["overall"]["accuracy"] for m in model_evaluations.values()]

    x = np.arange(len(model_names))
    width = 0.35

    plt.bar(x - width/2, f1_scores, width, label="Macro F1", color="#6366f1")
    plt.bar(x + width/2, acc_scores, width, label="Accuracy", color="#10b981")
    plt.xticks(x, model_names)
    plt.ylabel("Score")
    plt.title("Model Performance Comparison (Held-Out Test Set)")
    plt.legend()
    plt.ylim(0.0, 1.0)
    plt.tight_layout()
    comp_plot_path = os.path.join(graphs_dir, "model_comparison.png")
    plt.savefig(comp_plot_path, dpi=300)
    plt.close()
    print(f"[Evaluation] Saved model comparison chart to {comp_plot_path}")

    print("\n[Evaluation] All evaluation artifacts successfully generated!")
    return model_evaluations


if __name__ == "__main__":
    run_full_evaluation_suite()
