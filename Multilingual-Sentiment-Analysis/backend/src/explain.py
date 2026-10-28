"""
GlobalSense AI - Genuine Occlusion-Based Model Explainability Module
Computes true word-level importance by measuring the change in predicted class
probability when each word is systematically masked/omitted from the input.
"""

from __future__ import annotations

import re
from typing import Callable, Dict, List, Any
import numpy as np

from src.preprocessing import tokenize_words_multilingual, normalize_text


def compute_occlusion_importance(
    text: str,
    predict_proba_fn: Callable[[List[str]], np.ndarray],
    target_class_idx: int
) -> Dict[str, Any]:
    """
    Compute genuine word-level attribution via systematic occlusion sensitivity.

    Args:
        text: Input review text.
        predict_proba_fn: Function accepting a batch of strings and returning [batch_size, num_classes] probabilities.
        target_class_idx: Index of the predicted or selected target class.

    Returns:
        Dictionary containing word tokens, normalized importance scores, and directionality.
    """
    normalized = normalize_text(text)
    tokens = tokenize_words_multilingual(normalized)

    if not tokens:
        return {
            "method": "occlusion-based importance",
            "tokens": [],
            "baseline_confidence": 0.0
        }

    # 1. Baseline prediction on full text
    baseline_probs = predict_proba_fn([normalized])[0]
    baseline_conf = float(baseline_probs[target_class_idx])

    if len(tokens) == 1:
        return {
            "method": "occlusion-based importance",
            "tokens": [{
                "token": tokens[0],
                "score": 1.0,
                "delta": 0.0,
                "impact": "supports"
            }],
            "baseline_confidence": round(baseline_conf, 4)
        }

    # 2. Generate perturbed inputs (one per token)
    perturbed_texts: List[str] = []
    for i in range(len(tokens)):
        # Construct text omitting token i
        remaining = tokens[:i] + tokens[i+1:]
        perturbed_texts.append(" ".join(remaining))

    # 3. Batch evaluate perturbed texts
    perturbed_probs = predict_proba_fn(perturbed_texts)  # shape: [len(tokens), num_classes]

    # 4. Compute attribution delta: Delta = P(target | full) - P(target | without word)
    raw_deltas = []
    for i in range(len(tokens)):
        p_without = float(perturbed_probs[i][target_class_idx])
        delta = baseline_conf - p_without
        raw_deltas.append(delta)

    raw_deltas_arr = np.array(raw_deltas)
    max_abs = np.max(np.abs(raw_deltas_arr)) if len(raw_deltas_arr) > 0 else 0.0

    # 5. Normalize scores to range [-1.0, 1.0]
    token_attributions: List[Dict[str, Any]] = []
    for i, token in enumerate(tokens):
        delta = raw_deltas[i]
        normalized_score = round(float(delta / max_abs), 3) if max_abs > 1e-6 else 0.0

        if normalized_score > 0.08:
            impact = "supports"
        elif normalized_score < -0.08:
            impact = "opposes"
        else:
            impact = "neutral"

        token_attributions.append({
            "token": token,
            "score": normalized_score,
            "raw_delta": round(float(delta), 4),
            "impact": impact
        })

    return {
        "method": "occlusion-based importance",
        "tokens": token_attributions,
        "baseline_confidence": round(baseline_conf, 4)
    }
