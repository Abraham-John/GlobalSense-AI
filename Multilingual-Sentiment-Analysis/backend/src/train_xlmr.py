"""
GlobalSense AI - XLM-RoBERTa Fine-Tuning Module
Provides CLI and training loop for fine-tuning xlm-roberta-base on the multilingual dataset.
Supports full GPU training, mixed precision, and a --tiny_sample flag for end-to-end pipeline verification on CPU.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from typing import Dict, Any, List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader, Dataset
from transformers import (
    AutoConfig,
    AutoModelForSequenceClassification,
    AutoTokenizer,
    get_linear_schedule_with_warmup,
)
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, precision_score, recall_score

from src.data_loader import CANONICAL_CLASSES, LABEL_TO_ID, TARGET_LANGUAGES
from src.preprocessing import normalize_text

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class MultilingualTransformerDataset(Dataset):
    def __init__(self, texts: List[str], labels: List[int], tokenizer: AutoTokenizer, max_len: int = 128):
        self.encodings = tokenizer(
            texts,
            truncation=True,
            padding="max_length",
            max_length=max_len,
            return_tensors="pt"
        )
        self.labels = labels

    def __len__(self) -> int:
        return len(self.labels)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        item = {key: val[idx] for key, val in self.encodings.items()}
        item["labels"] = torch.tensor(self.labels[idx], dtype=torch.long)
        return item


def train_and_evaluate_xlmr(
    model_name: str = "xlm-roberta-base",
    data_dir: str = "dataset/processed",
    output_dir: str = "models/xlmr",
    results_dir: str = "results/outputs",
    epochs: int = 3,
    batch_size: int = 16,
    lr: float = 2e-5,
    max_len: int = 128,
    tiny_sample: int = 0
) -> Dict[str, Any]:
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(results_dir, exist_ok=True)

    train_df = pd.read_csv(os.path.join(data_dir, "train.csv"))
    val_df = pd.read_csv(os.path.join(data_dir, "val.csv"))
    test_df = pd.read_csv(os.path.join(data_dir, "test.csv"))

    if tiny_sample > 0:
        print(f"[XLM-R] Running pipeline verification with tiny sample of {tiny_sample} records...")
        train_df = train_df.groupby("label").head(tiny_sample).reset_index(drop=True)
        val_df = val_df.groupby("label").head(tiny_sample).reset_index(drop=True)
        test_df = test_df.groupby("label").head(tiny_sample).reset_index(drop=True)

    print(f"[XLM-R] Loading tokenizer and model: {model_name}...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    # Configure 3 classes with canonical names
    config = AutoConfig.from_pretrained(
        model_name,
        num_labels=3,
        id2label={0: "Positive", 1: "Negative", 2: "Neutral"},
        label2id={"Positive": 0, "Negative": 1, "Neutral": 2}
    )
    model = AutoModelForSequenceClassification.from_pretrained(model_name, config=config).to(DEVICE)

    train_ds = MultilingualTransformerDataset(
        train_df["text"].fillna("").tolist(),
        [LABEL_TO_ID[l] for l in train_df["label"]],
        tokenizer,
        max_len=max_len
    )
    val_ds = MultilingualTransformerDataset(
        val_df["text"].fillna("").tolist(),
        [LABEL_TO_ID[l] for l in val_df["label"]],
        tokenizer,
        max_len=max_len
    )

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    total_steps = len(train_loader) * epochs
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=int(total_steps * 0.1),
        num_training_steps=total_steps
    )

    print(f"[XLM-R] Training on {DEVICE} ({'GPU' if torch.cuda.is_available() else 'CPU'}) for {epochs} epochs...")
    best_val_f1 = 0.0
    history = []
    t_start = time.time()

    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        for batch in train_loader:
            optimizer.zero_grad()
            input_ids = batch["input_ids"].to(DEVICE)
            attention_mask = batch["attention_mask"].to(DEVICE)
            labels = batch["labels"].to(DEVICE)

            outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
            loss = outputs.loss
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()
            train_loss += loss.item()

        train_loss /= len(train_loader)

        # Validation
        model.eval()
        val_loss = 0.0
        val_preds, val_targets = [], []
        with torch.no_grad():
            for batch in val_loader:
                input_ids = batch["input_ids"].to(DEVICE)
                attention_mask = batch["attention_mask"].to(DEVICE)
                labels = batch["labels"].to(DEVICE)
                outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
                val_loss += outputs.loss.item()
                preds = torch.argmax(outputs.logits, dim=-1).cpu().numpy()
                val_preds.extend(preds)
                val_targets.extend(labels.cpu().numpy())

        val_loss /= len(val_loader)
        val_f1 = f1_score(val_targets, val_preds, average="macro", zero_division=0)
        val_acc = accuracy_score(val_targets, val_preds)

        print(f"Epoch {epoch}/{epochs} - Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.4f} | Val F1: {val_f1:.4f}")

        history.append({
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "val_loss": round(val_loss, 4),
            "val_accuracy": round(val_acc, 4),
            "val_macro_f1": round(val_f1, 4)
        })

        if val_f1 >= best_val_f1:
            best_val_f1 = val_f1
            model.save_pretrained(output_dir)
            tokenizer.save_pretrained(output_dir)

    train_time = round(time.time() - t_start, 2)
    print(f"[XLM-R] Training finished in {train_time}s. Saved to {output_dir}")

    # Evaluate on Test Set
    test_texts = test_df["text"].fillna("").tolist()
    y_test = np.array([LABEL_TO_ID[l] for l in test_df["label"].tolist()])
    test_ds = MultilingualTransformerDataset(test_texts, y_test.tolist(), tokenizer, max_len=max_len)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)

    model.eval()
    t0 = time.perf_counter()
    test_preds, test_probs = [], []
    with torch.no_grad():
        for batch in test_loader:
            input_ids = batch["input_ids"].to(DEVICE)
            attention_mask = batch["attention_mask"].to(DEVICE)
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            probs = torch.softmax(outputs.logits, dim=-1).cpu().numpy()
            preds = np.argmax(probs, axis=1)
            test_preds.extend(preds)
            test_probs.extend(probs)

    total_latency = time.perf_counter() - t0
    latency_ms = round((total_latency / max(len(test_texts), 1)) * 1000, 3)

    test_preds = np.array(test_preds)
    test_acc = round(accuracy_score(y_test, test_preds), 4)
    macro_f1 = round(f1_score(y_test, test_preds, average="macro", zero_division=0), 4)
    weighted_f1 = round(f1_score(y_test, test_preds, average="weighted", zero_division=0), 4)
    prec_macro = round(precision_score(y_test, test_preds, average="macro", zero_division=0), 4)
    rec_macro = round(recall_score(y_test, test_preds, average="macro", zero_division=0), 4)

    class_rep = classification_report(y_test, test_preds, target_names=CANONICAL_CLASSES, output_dict=True, zero_division=0)
    per_class_f1 = {cls: round(class_rep[cls]["f1-score"], 4) for cls in CANONICAL_CLASSES}
    cm = confusion_matrix(y_test, test_preds, labels=[0, 1, 2]).tolist()

    per_language: Dict[str, Any] = {}
    for lang in TARGET_LANGUAGES:
        mask = (test_df["language"] == lang).to_numpy()
        if np.sum(mask) == 0:
            continue
        lang_true = y_test[mask]
        lang_pred = test_preds[mask]
        per_language[lang] = {
            "samples": int(np.sum(mask)),
            "accuracy": round(accuracy_score(lang_true, lang_pred), 4),
            "macro_f1": round(f1_score(lang_true, lang_pred, average="macro", zero_division=0), 4),
            "precision_macro": round(precision_score(lang_true, lang_pred, average="macro", zero_division=0), 4),
            "recall_macro": round(recall_score(lang_true, lang_pred, average="macro", zero_division=0), 4),
        }

    results = {
        "model_name": f"Fine-Tuned {model_name}",
        "device": str(DEVICE),
        "is_tiny_sample_test": tiny_sample > 0,
        "overall": {
            "accuracy": test_acc,
            "macro_f1": macro_f1,
            "weighted_f1": weighted_f1,
            "precision_macro": prec_macro,
            "recall_macro": rec_macro,
            "latency_ms_per_sample": latency_ms,
            "train_time_sec": train_time,
            "test_sample_count": len(test_df)
        },
        "per_class_f1": per_class_f1,
        "confusion_matrix": {
            "labels": CANONICAL_CLASSES,
            "matrix": cm
        },
        "per_language": per_language,
        "training_history": history
    }

    res_path = os.path.join(results_dir, "xlmr_results.json" if tiny_sample == 0 else "xlmr_tiny_test_results.json")
    with open(res_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"[XLM-R] Evaluation metrics saved to {res_path}")
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune XLM-RoBERTa for 3-class Multilingual Sentiment")
    parser.add_argument("--model_name", type=str, default="xlm-roberta-base")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--max_len", type=int, default=128)
    parser.add_argument("--tiny_sample", type=int, default=0, help="Set to small number (e.g. 5) to dry-run CPU pipeline")
    args = parser.parse_args()

    train_and_evaluate_xlmr(
        model_name=args.model_name,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        max_len=args.max_len,
        tiny_sample=args.tiny_sample
    )
