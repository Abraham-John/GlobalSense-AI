"""
GlobalSense AI / GlobalSense AI - Unified Multilingual Prediction Service
Loads models (Pretrained XLM-R, Baseline B, Baseline A, BiLSTM, Fine-Tuned XLM-R),
coordinates language detection, text normalization, confidence calculation,
uncertainty handling, and genuine occlusion explainability.
"""

from __future__ import annotations

import os
import sys
import time
import traceback
from pathlib import Path
from typing import Dict, List, Any, Optional

# Ensure backend root is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import joblib
import numpy as np
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from app.core.config import settings
from scripts.evaluate_pretrained import get_id2label_mapping
from src.data_loader import CANONICAL_CLASSES, LABEL_TO_ID, ID_TO_LABEL, TARGET_LANGUAGES
from src.explain import compute_occlusion_importance
from src.language_detection import get_language_detector, SUPPORTED_LANGUAGES
from src.preprocessing import get_text_statistics, normalize_text
from src.train_bilstm import MultilingualBiLSTM, SubwordCharTokenizer

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class SentimentPredictionEngine:
    def __init__(self, base_dir: Optional[str] = None):
        if base_dir is None:
            self.backend_dir = BACKEND_DIR
        else:
            self.backend_dir = Path(base_dir)

        self.models_dir = self.backend_dir / "models"
        self.detector = get_language_detector()

        self.loaded_models: Dict[str, Any] = {}
        self.active_model_key: str = "baseline_b"
        self._initialize_available_models()

    def _initialize_available_models(self) -> None:
        """
        Probe models directory and initialize available models.
        Order of preference for active model:
          1. Fine-tuned models/xlmr/ (if trained)
          2. Pretrained models/pretrained_xlmr/
          3. Baseline B (Word + Char n-gram TF-IDF)
          4. Baseline A
        """
        print(f"[Engine] Scanning model directory: {self.models_dir}")

        # 1. Baseline B (Champion CPU model)
        baseline_b_path = self.models_dir / "baseline_b.joblib"
        if baseline_b_path.exists():
            try:
                self.loaded_models["baseline_b"] = {
                    "pipeline": joblib.load(str(baseline_b_path)),
                    "name": "Baseline B (Word + Char n-gram TF-IDF + Logistic Regression)",
                    "type": "classical_ml",
                    "origin": "trained_locally",
                    "label": "Trained Locally on 10-Language Balanced Corpus"
                }
                self.active_model_key = "baseline_b"
                print(" -> Baseline B loaded successfully.")
            except Exception as e:
                print(f"[Engine] Could not load Baseline B: {e}", file=sys.stderr)
                traceback.print_exc()

        # 2. Baseline A
        baseline_a_path = self.models_dir / "baseline_a.joblib"
        if baseline_a_path.exists():
            try:
                self.loaded_models["baseline_a"] = {
                    "pipeline": joblib.load(str(baseline_a_path)),
                    "name": "Baseline A (Word TF-IDF + Logistic Regression)",
                    "type": "classical_ml",
                    "origin": "trained_locally",
                    "label": "Trained Locally (Classical Baseline)"
                }
                print(" -> Baseline A loaded successfully.")
            except Exception as e:
                print(f"[Engine] Could not load Baseline A: {e}", file=sys.stderr)
                traceback.print_exc()

        # 3. BiLSTM
        bilstm_weights = self.models_dir / "bilstm.pt"
        bilstm_vocab = self.models_dir / "bilstm_vocab.json"
        if bilstm_weights.exists() and bilstm_vocab.exists():
            try:
                tokenizer = SubwordCharTokenizer.load(str(bilstm_vocab))
                model = MultilingualBiLSTM(
                    vocab_size=len(tokenizer.token2id),
                    embed_dim=128,
                    hidden_dim=128,
                    num_classes=3
                ).to(DEVICE)
                model.load_state_dict(torch.load(str(bilstm_weights), map_location=DEVICE))
                model.eval()
                self.loaded_models["bilstm"] = {
                    "model": model,
                    "tokenizer": tokenizer,
                    "name": "Deep Learning BiLSTM (Subword-Aware PyTorch)",
                    "type": "deep_learning_rnn",
                    "origin": "trained_locally",
                    "label": "Trained Locally (2-Layer BiLSTM)"
                }
                print(" -> BiLSTM loaded successfully.")
            except Exception as e:
                print(f"[Engine] Could not load BiLSTM: {e}", file=sys.stderr)
                traceback.print_exc()

        # 4. Pretrained XLM-R Checkpoint (models/pretrained_xlmr)
        pretrained_dir = self.models_dir / "pretrained_xlmr"
        if pretrained_dir.exists() and ((pretrained_dir / "pytorch_model.bin").exists() or (pretrained_dir / "model.safetensors").exists()):
            try:
                print(f" -> Loading Pretrained XLM-RoBERTa from {pretrained_dir}...")
                tok = AutoTokenizer.from_pretrained(str(pretrained_dir))
                mdl = AutoModelForSequenceClassification.from_pretrained(str(pretrained_dir)).to(DEVICE)
                mdl.eval()
                mapping = get_id2label_mapping(mdl.config)
                self.loaded_models["pretrained_xlmr"] = {
                    "model": mdl,
                    "tokenizer": tok,
                    "mapping": mapping,
                    "name": "Pretrained XLM-RoBERTa (CardiffNLP)",
                    "type": "transformer",
                    "origin": "pretrained",
                    "label": "Pretrained Multilingual Checkpoint (CardiffNLP - Not Trained by this Project)"
                }
                self.active_model_key = "pretrained_xlmr"
                print(" -> Pretrained XLM-RoBERTa loaded and set as active model.")
            except Exception as e:
                print(f"[Engine] Could not load local pretrained XLM-R: {e}", file=sys.stderr)
                traceback.print_exc()

        # 5. Local Fine-Tuned XLM-R (models/xlmr) - only activate if full training occurred
        xlmr_dir = self.models_dir / "xlmr"
        full_results_path = self.backend_dir / "results" / "outputs" / "xlmr_full_test_results.json"
        if xlmr_dir.exists() and (xlmr_dir / "config.json").exists() and full_results_path.exists():
            try:
                print(f" -> Loading fine-tuned XLM-RoBERTa from {xlmr_dir}...")
                tok = AutoTokenizer.from_pretrained(str(xlmr_dir))
                mdl = AutoModelForSequenceClassification.from_pretrained(str(xlmr_dir)).to(DEVICE)
                mdl.eval()
                self.loaded_models["xlmr_local"] = {
                    "model": mdl,
                    "tokenizer": tok,
                    "name": "Fine-Tuned XLM-RoBERTa (GlobalSense AI)",
                    "type": "transformer",
                    "origin": "trained_locally",
                    "label": "Fine-Tuned on Balanced Multilingual Corpus"
                }
                self.active_model_key = "xlmr_local"
                print(" -> Fine-Tuned XLM-RoBERTa loaded and set as active model.")
            except Exception as e:
                print(f"[Engine] Could not load local fine-tuned XLM-R: {e}", file=sys.stderr)
                traceback.print_exc()
        elif xlmr_dir.exists() and (xlmr_dir / "config.json").exists():
            print(" -> models/xlmr detected as smoke-test/partial. Keeping pretrained_xlmr as active verified model.")

        print(f"[Engine] Active model key: {self.active_model_key}")

    def get_model_info(self) -> Dict[str, Any]:
        """Provide transparent metadata about the currently active model."""
        if not self.loaded_models:
            return {
                "status": "failed",
                "message": "No model loaded. Please check backend/models/."
            }

        active = self.loaded_models.get(self.active_model_key)
        if not active:
            active = list(self.loaded_models.values())[0]

        return {
            "status": "ready",
            "active_model_key": self.active_model_key,
            "model_name": active["name"],
            "model_type": active["type"],
            "model_origin": active["origin"],
            "origin_label": active["label"],
            "is_uncertainty_enabled": True,
            "uncertainty_threshold": settings.UNCERTAINTY_THRESHOLD,
            "available_models": list(self.loaded_models.keys()),
            "classes": CANONICAL_CLASSES,
            "supported_languages": SUPPORTED_LANGUAGES,
            "device": str(DEVICE),
            "max_sequence_length": 128,
            "version": settings.VERSION
        }

    def set_active_model(self, model_key: str) -> bool:
        """Switch the active inference model key."""
        if model_key in self.loaded_models:
            self.active_model_key = model_key
            print(f"[Engine] Switched active model to: {model_key}")
            return True
        return False

    def _predict_probabilities_batch(self, texts: List[str]) -> np.ndarray:
        """
        Internal batch probability predictor for active model.
        Returns shape [len(texts), 3] where columns correspond strictly to [Positive, Negative, Neutral].
        """
        model_entry = self.loaded_models.get(self.active_model_key)
        if not model_entry:
            raise RuntimeError("No active model is loaded.")

        mtype = model_entry["type"]
        if mtype == "classical_ml":
            pipeline = model_entry["pipeline"]
            probs = pipeline.predict_proba(texts)
            return probs

        elif mtype == "deep_learning_rnn":
            model = model_entry["model"]
            tokenizer = model_entry["tokenizer"]
            encoded = [tokenizer.encode(t, max_length=128) for t in texts]
            inp = torch.tensor(encoded, dtype=torch.long).to(DEVICE)
            with torch.no_grad():
                logits = model(inp)
                probs = torch.softmax(logits, dim=-1).cpu().numpy()
            return probs

        elif mtype == "transformer":
            model = model_entry["model"]
            tokenizer = model_entry["tokenizer"]
            enc = tokenizer(texts, truncation=True, padding=True, max_length=128, return_tensors="pt").to(DEVICE)
            with torch.no_grad():
                logits = model(**enc).logits
                probs = torch.softmax(logits, dim=-1).cpu().numpy()

            # Dynamic id2label mapping
            mapping = model_entry.get("mapping")
            if mapping:
                reordered = np.zeros_like(probs)
                for model_idx, canon_idx in mapping.items():
                    reordered[:, canon_idx] = probs[:, model_idx]
                return reordered

            return probs

        raise ValueError(f"Unknown model type: {mtype}")

    def analyze(
        self,
        text: str,
        override_language: Optional[str] = None,
        explain: bool = True
    ) -> Dict[str, Any]:
        """
        Full single-text inference pipeline:
        1. Language detection
        2. Text normalization
        3. Sentiment classification & model confidence
        4. Uncertainty threshold check (< 0.60 -> 'Uncertain')
        5. Causal occlusion-based explainability (safely bounded for CPU)
        6. Descriptive text statistics
        """
        if not text or not text.strip():
            raise ValueError("Input text cannot be empty.")

        start_time = time.perf_counter()

        # Step 1: Language detection
        lang_info = self.detector.detect(text, override_language=override_language)

        # Step 2: Normalization
        clean_text = normalize_text(text)

        # Step 3: Classification
        probs = self._predict_probabilities_batch([clean_text])[0]
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        pred_idx = int(np.argmax(probs))
        predicted_sentiment = ID_TO_LABEL[pred_idx]
        confidence = float(probs[pred_idx])

        # Step 4: Uncertainty evaluation
        is_uncertain = bool(confidence < settings.UNCERTAINTY_THRESHOLD)
        if is_uncertain:
            display_sentiment = "Uncertain"
            uncertainty_notice = (
                f"Model confidence ({confidence*100:.1f}%) is below the {settings.UNCERTAINTY_THRESHOLD*100:.0f}% threshold. "
                f"Prediction between '{predicted_sentiment}' and alternative classes is ambiguous."
            )
        else:
            display_sentiment = predicted_sentiment
            uncertainty_notice = None

        # Step 5: Occlusion explainability
        explanation = None
        if explain:
            # Bound occlusion input if long on transformer to prevent CPU freeze
            active_meta = self.loaded_models.get(self.active_model_key, {})
            words = clean_text.split()
            occlusion_text = clean_text
            note = None
            if active_meta.get("type") == "transformer" and len(words) > 25:
                occlusion_text = " ".join(words[:25])
                note = "Occlusion importance calculated on first 25 words to maintain sub-second CPU response."

            explanation = compute_occlusion_importance(
                occlusion_text,
                self._predict_probabilities_batch,
                target_class_idx=pred_idx
            )
            if note and explanation:
                explanation["note"] = note

        # Step 6: Text statistics
        stats = get_text_statistics(clean_text)

        prob_dict = {
            "Positive": round(float(probs[0]), 4),
            "Negative": round(float(probs[1]), 4),
            "Neutral": round(float(probs[2]), 4)
        }

        active_meta = self.loaded_models.get(self.active_model_key, {})

        return {
            "text": clean_text,
            "sentiment": display_sentiment,
            "raw_sentiment": predicted_sentiment,
            "confidence": round(confidence, 4),
            "is_uncertain": is_uncertain,
            "uncertainty_notice": uncertainty_notice,
            "probabilities": prob_dict,
            "language": lang_info,
            "model": {
                "key": self.active_model_key,
                "name": active_meta.get("name", "Unknown"),
                "origin": active_meta.get("origin", "unknown"),
                "origin_label": active_meta.get("label", "")
            },
            "explanation": explanation,
            "statistics": stats,
            "latency_ms": elapsed_ms,
            "disclaimer": "Predictions are probabilistic estimates (model confidence) and may vary on sarcasm, heavy slang, or code-mixing."
        }

    def analyze_batch(
        self,
        texts: List[str],
        max_rows: int = 500
    ) -> Dict[str, Any]:
        """
        Batch inference with row limit validation and skipped-row reporting.
        """
        t0 = time.perf_counter()
        results: List[Dict[str, Any]] = []
        skipped: List[Dict[str, Any]] = []

        if len(texts) > max_rows:
            skipped.append({
                "row_index": -1,
                "reason": f"Total rows ({len(texts)}) exceeded maximum permitted limit of {max_rows}."
            })
            texts = texts[:max_rows]

        valid_indices: List[int] = []
        valid_texts: List[str] = []

        for idx, t in enumerate(texts):
            if not isinstance(t, str) or not t.strip():
                skipped.append({"row_index": idx, "reason": "Empty or non-string row."})
                continue
            if len(t) > 3000:
                skipped.append({"row_index": idx, "reason": "Text length exceeds 3,000 characters."})
                continue
            valid_indices.append(idx)
            valid_texts.append(normalize_text(t))

        if valid_texts:
            probs = self._predict_probabilities_batch(valid_texts)
            for i, (orig_idx, clean_t) in enumerate(zip(valid_indices, valid_texts)):
                p = probs[i]
                pred_idx = int(np.argmax(p))
                conf = float(p[pred_idx])
                raw_pred = ID_TO_LABEL[pred_idx]
                is_unc = bool(conf < settings.UNCERTAINTY_THRESHOLD)
                disp_sentiment = "Uncertain" if is_unc else raw_pred
                lang_info = self.detector.detect(clean_t)

                results.append({
                    "row_index": orig_idx,
                    "text": clean_t,
                    "sentiment": disp_sentiment,
                    "raw_sentiment": raw_pred,
                    "confidence": round(conf, 4),
                    "is_uncertain": is_unc,
                    "probabilities": {
                        "Positive": round(float(p[0]), 4),
                        "Negative": round(float(p[1]), 4),
                        "Neutral": round(float(p[2]), 4)
                    },
                    "language": lang_info["language_code"],
                    "language_name": lang_info["language_name"]
                })

        total_time_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {
            "total_submitted": len(texts),
            "processed_count": len(results),
            "skipped_count": len(skipped),
            "skipped_rows": skipped,
            "results": results,
            "batch_latency_ms": total_time_ms
        }


# Singleton engine
_engine_instance: Optional[SentimentPredictionEngine] = None

def get_prediction_engine() -> SentimentPredictionEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = SentimentPredictionEngine()
    return _engine_instance
