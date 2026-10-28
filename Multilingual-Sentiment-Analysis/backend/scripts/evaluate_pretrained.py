"""
Evaluate Pretrained Multilingual Transformer Checkpoints on Held-Out Test Set
Loads test.csv (2,952 samples), maps id2label dynamically to canonical [Positive, Negative, Neutral],
and benchmarks performance against local baselines.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple

import numpy as np
import pandas as pd
import torch
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, confusion_matrix
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Ensure backend root is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from src.data_loader import CANONICAL_CLASSES, LABEL_TO_ID, TARGET_LANGUAGES
from src.preprocessing import normalize_text

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def get_id2label_mapping(model_config: Any) -> Dict[int, int]:
    """
    Extracts id2label from model config and maps each model output index
    to canonical [Positive, Negative, Neutral] (0, 1, 2).
    Never assumes order; raises ValueError if mapping cannot be resolved.
    """
    id2label = getattr(model_config, "id2label", None)
    if not id2label:
        raise ValueError("Model config does not contain 'id2label' dictionary.")

    mapping: Dict[int, int] = {}
    for idx_key, raw_label in id2label.items():
        idx = int(idx_key)
        label_str = str(raw_label).strip().lower()
        if "pos" in label_str:
            mapping[idx] = LABEL_TO_ID["Positive"]  # 0
        elif "neg" in label_str:
            mapping[idx] = LABEL_TO_ID["Negative"]  # 1
        elif "neu" in label_str:
            mapping[idx] = LABEL_TO_ID["Neutral"]   # 2
        else:
            raise ValueError(f"Unrecognized sentiment label in id2label: '{raw_label}'")

    if len(mapping) != 3:
        raise ValueError(f"Expected 3 classes in mapping, got {len(mapping)}: {mapping}")

    return mapping


def compute_ece(probs: np.ndarray, y_true: np.ndarray, n_bins: int = 10) -> Tuple[float, List[Dict[str, Any]]]:
    """Expected Calibration Error across n_bins."""
    confidences = np.max(probs, axis=1)
    predictions = np.argmax(probs, axis=1)
    accuracies = (predictions == y_true).astype(float)

    bin_boundaries = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    bin_details = []

    for i in range(n_bins):
        low, high = bin_boundaries[i], bin_boundaries[i + 1]
        mask = (confidences > low) & (confidences <= high) if i > 0 else (confidences >= low) & (confidences <= high)
        n_samples = int(np.sum(mask))
        if n_samples > 0:
            bin_acc = float(np.mean(accuracies[mask]))
            bin_conf = float(np.mean(confidences[mask]))
            gap = abs(bin_acc - bin_conf)
            ece += (n_samples / len(y_true)) * gap
            bin_details.append({
                "bin_index": i + 1,
                "range": [round(low, 2), round(high, 2)],
                "samples": n_samples,
                "accuracy": round(bin_acc, 4),
                "confidence": round(bin_conf, 4),
                "calibration_gap": round(gap, 4)
            })
        else:
            bin_details.append({
                "bin_index": i + 1,
                "range": [round(low, 2), round(high, 2)],
                "samples": 0,
                "accuracy": 0.0,
                "confidence": 0.0,
                "calibration_gap": 0.0
            })

    return round(float(ece), 4), bin_details


def evaluate_checkpoint(
    model_path_or_id: str,
    key_name: str,
    display_name: str,
    origin_label: str,
    batch_size: int = 32,
    uncertainty_threshold: float = 0.60
) -> Dict[str, Any]:
    print("=" * 70)
    print(f"Evaluating Model: {display_name}")
    print(f"Source: {model_path_or_id}")
    print(f"Device: {DEVICE}")
    print("=" * 70)

    test_csv = BACKEND_DIR / "dataset" / "processed" / "test.csv"
    if not test_csv.exists():
        raise FileNotFoundError(f"Test dataset not found at {test_csv}")

    df_test = pd.read_csv(test_csv)
    print(f"Loaded test dataset: {len(df_test)} samples across {df_test['language'].nunique()} languages.")

    # Load tokenizer and model
    print("Loading tokenizer and model...")
    tokenizer = AutoTokenizer.from_pretrained(model_path_or_id)
    model = AutoModelForSequenceClassification.from_pretrained(model_path_or_id).to(DEVICE)
    model.eval()

    mapping = get_id2label_mapping(model.config)
    print(f"Resolved id2label mapping: {mapping}")

    label_col = "label" if "label" in df_test.columns else "sentiment"
    y_true = np.array([LABEL_TO_ID[label] for label in df_test[label_col]])
    texts = [normalize_text(t) for t in df_test["text"].tolist()]

    all_canonical_probs = []
    latencies = []

    print(f"Running inference across {len(texts)} samples (batch_size={batch_size})...")
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i + batch_size]
        t0 = time.perf_counter()
        enc = tokenizer(
            batch_texts,
            truncation=True,
            padding=True,
            max_length=128,
            return_tensors="pt"
        ).to(DEVICE)
        with torch.no_grad():
            logits = model(**enc).logits
            raw_probs = torch.softmax(logits, dim=-1).cpu().numpy()
        batch_latency_ms = (time.perf_counter() - t0) * 1000
        latencies.append(batch_latency_ms / len(batch_texts))

        # Reorder to canonical [Positive: 0, Negative: 1, Neutral: 2]
        canonical_batch = np.zeros((len(batch_texts), 3))
        for model_idx, canon_idx in mapping.items():
            canonical_batch[:, canon_idx] = raw_probs[:, model_idx]
        all_canonical_probs.append(canonical_batch)

    all_probs = np.vstack(all_canonical_probs)
    preds = np.argmax(all_probs, axis=1)
    confs = np.max(all_probs, axis=1)

    avg_cpu_latency_ms = round(float(np.mean(latencies)), 3)
    acc = round(float(accuracy_score(y_true, preds)), 4)
    macro_f1 = round(float(f1_score(y_true, preds, average="macro")), 4)
    weighted_f1 = round(float(f1_score(y_true, preds, average="weighted")), 4)
    prec_macro = round(float(precision_score(y_true, preds, average="macro", zero_division=0)), 4)
    rec_macro = round(float(recall_score(y_true, preds, average="macro", zero_division=0)), 4)

    # Per-class F1
    per_class_f1 = f1_score(y_true, preds, average=None)
    f1_dict = {
        "Positive": round(float(per_class_f1[0]), 4),
        "Negative": round(float(per_class_f1[1]), 4),
        "Neutral": round(float(per_class_f1[2]), 4)
    }

    # Selective Accuracy (Uncertainty threshold)
    above_thresh_mask = confs >= uncertainty_threshold
    num_below_thresh = int(np.sum(~above_thresh_mask))
    pct_below_thresh = round(float(num_below_thresh / len(y_true) * 100), 2)
    selective_acc = round(float(accuracy_score(y_true[above_thresh_mask], preds[above_thresh_mask])), 4) if np.sum(above_thresh_mask) > 0 else 0.0

    # Calibration ECE
    ece_val, calib_bins = compute_ece(all_probs, y_true, n_bins=10)

    # Per-language breakdown
    per_language: Dict[str, Any] = {}
    for lang in df_test["language"].unique():
        idx = df_test["language"] == lang
        lang_y = y_true[idx]
        lang_pred = preds[idx]
        per_language[lang] = {
            "samples": int(np.sum(idx)),
            "accuracy": round(float(accuracy_score(lang_y, lang_pred)), 4),
            "macro_f1": round(float(f1_score(lang_y, lang_pred, average="macro", zero_division=0)), 4)
        }

    # Confusion matrix
    cm = confusion_matrix(y_true, preds).tolist()

    # Error analysis: collect misclassified samples
    misclassified = []
    for idx, (t, yt, yp, p) in enumerate(zip(texts, y_true, preds, all_probs)):
        if yt != yp and len(misclassified) < 25:
            misclassified.append({
                "text": t[:140],
                "language": df_test["language"].iloc[idx],
                "ground_truth": CANONICAL_CLASSES[yt],
                "predicted": CANONICAL_CLASSES[yp],
                "confidence": round(float(p[yp]), 4),
                "probabilities": {
                    "Positive": round(float(p[0]), 4),
                    "Negative": round(float(p[1]), 4),
                    "Neutral": round(float(p[2]), 4)
                }
            })

    result_data = {
        "key": key_name,
        "name": display_name,
        "type": "transformer",
        "origin": "pretrained",
        "origin_label": origin_label,
        "overall": {
            "accuracy": acc,
            "macro_f1": macro_f1,
            "weighted_f1": weighted_f1,
            "precision_macro": prec_macro,
            "recall_macro": rec_macro,
            "latency_ms_per_sample": avg_cpu_latency_ms,
            "ece": ece_val,
            "uncertainty_threshold": uncertainty_threshold,
            "samples_below_threshold": num_below_thresh,
            "percent_below_threshold": pct_below_thresh,
            "selective_accuracy": selective_acc,
            "per_class_f1": f1_dict
        },
        "per_language": per_language,
        "confusion_matrix": {
            "labels": CANONICAL_CLASSES,
            "matrix": cm
        },
        "calibration": {
            "ece": ece_val,
            "bins": calib_bins
        },
        "error_samples": misclassified
    }

    print("\n" + "=" * 50)
    print(f"RESULTS FOR {display_name}:")
    print(f"Test Accuracy: {acc * 100:.2f}% | Macro-F1: {macro_f1:.4f}")
    print(f"Selective Accuracy (conf >= {uncertainty_threshold}): {selective_acc * 100:.2f}% (Excluded: {pct_below_thresh}%)")
    print(f"ECE: {ece_val:.4f} | Avg CPU Latency: {avg_cpu_latency_ms} ms/sample")
    print("=" * 50 + "\n")

    return result_data


if __name__ == "__main__":
    local_pretrained_dir = BACKEND_DIR / "models" / "pretrained_xlmr"
    model_source = str(local_pretrained_dir) if (local_pretrained_dir / "pytorch_model.bin").exists() else "cardiffnlp/twitter-xlm-roberta-base-sentiment"

    res = evaluate_checkpoint(
        model_source,
        key_name="pretrained_xlmr",
        display_name="Pretrained XLM-RoBERTa (CardiffNLP)",
        origin_label="Pretrained Multilingual Checkpoint (CardiffNLP - Not Trained by this Project)",
        batch_size=16,
        uncertainty_threshold=0.60
    )

    # Save standalone evaluation result
    out_file = BACKEND_DIR / "results" / "outputs" / "pretrained_xlmr_results.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(res, f, indent=2)
    print(f"Saved standalone results to {out_file}")

    # Merge into model_comparison.json
    comp_file = BACKEND_DIR / "results" / "outputs" / "model_comparison.json"
    if comp_file.exists():
        with open(comp_file, "r", encoding="utf-8") as f:
            comparison = json.load(f)
    else:
        comparison = {}

    comparison["pretrained_xlmr"] = res
    with open(comp_file, "w", encoding="utf-8") as f:
        json.dump(comparison, f, indent=2)
    print(f"Updated {comp_file} with pretrained model metrics.")
