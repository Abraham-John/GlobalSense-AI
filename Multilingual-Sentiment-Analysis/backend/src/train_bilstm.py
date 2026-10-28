"""
GlobalSense AI - Deep Learning Multilingual BiLSTM Module
PyTorch implementation of a 2-layer Bidirectional LSTM with subword/char-aware representation,
trained on the balanced multilingual corpus and evaluated under identical held-out test protocol.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from collections import Counter
from typing import Dict, List, Any, Tuple

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, confusion_matrix, classification_report

from src.data_loader import CANONICAL_CLASSES, LABEL_TO_ID, TARGET_LANGUAGES
from src.preprocessing import normalize_text, tokenize_words_multilingual

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class SubwordCharTokenizer:
    """
    Subword and multi-script character-aware tokenizer designed for cross-lingual NLP.
    Handles unsegmented scripts (Japanese), complex morphology (Hindi/Arabic), and Latin.
    """
    def __init__(self, max_vocab: int = 15000):
        self.max_vocab = max_vocab
        self.pad_token = "<pad>"
        self.unk_token = "<unk>"
        self.token2id: Dict[str, int] = {self.pad_token: 0, self.unk_token: 1}
        self.id2token: Dict[int, str] = {0: self.pad_token, 1: self.unk_token}

    def tokenize(self, text: str) -> List[str]:
        words = tokenize_words_multilingual(text)
        subwords: List[str] = []
        for w in words:
            w_lower = w.lower()
            if len(w_lower) <= 3:
                subwords.append(w_lower)
            else:
                # Add word prefix/stem + character trigrams
                subwords.append(w_lower[:4])
                for i in range(len(w_lower) - 2):
                    subwords.append(w_lower[i:i+3])
        return subwords

    def fit(self, texts: List[str]) -> None:
        counter = Counter()
        for t in texts:
            counter.update(self.tokenize(t))
        most_common = counter.most_common(self.max_vocab - 2)
        for idx, (token, _) in enumerate(most_common, start=2):
            self.token2id[token] = idx
            self.id2token[idx] = token

    def encode(self, text: str, max_length: int = 128) -> List[int]:
        tokens = self.tokenize(text)
        ids = [self.token2id.get(t, 1) for t in tokens[:max_length]]
        if len(ids) < max_length:
            ids += [0] * (max_length - len(ids))
        return ids

    def save(self, filepath: str) -> None:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump({"token2id": self.token2id, "max_vocab": self.max_vocab}, f, ensure_ascii=False)

    @classmethod
    def load(cls, filepath: str) -> "SubwordCharTokenizer":
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        tok = cls(max_vocab=data["max_vocab"])
        tok.token2id = data["token2id"]
        tok.id2token = {int(v): k for k, v in tok.token2id.items()}
        return tok


class TextClassificationDataset(Dataset):
    def __init__(self, texts: List[str], labels: List[int], tokenizer: SubwordCharTokenizer, max_len: int = 128):
        self.encoded = [tokenizer.encode(t, max_length=max_len) for t in texts]
        self.labels = labels

    def __len__(self) -> int:
        return len(self.labels)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        return torch.tensor(self.encoded[idx], dtype=torch.long), torch.tensor(self.labels[idx], dtype=torch.long)


class MultilingualBiLSTM(nn.Module):
    """
    2-Layer Bidirectional LSTM with embedding dropout, bidirectional processing,
    and adaptive concat pooling (max + mean) across time steps.
    """
    def __init__(self, vocab_size: int, embed_dim: int = 128, hidden_dim: int = 128, num_classes: int = 3):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.embed_dropout = nn.Dropout(0.2)
        self.lstm = nn.LSTM(
            input_size=embed_dim,
            hidden_size=hidden_dim,
            num_layers=2,
            batch_first=True,
            bidirectional=True,
            dropout=0.2
        )
        # 2 directions * 2 poolings (mean + max) = 4 * hidden_dim
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim * 4, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [batch_size, seq_len]
        mask = (x != 0).unsqueeze(-1).float()  # [batch_size, seq_len, 1]
        emb = self.embed_dropout(self.embedding(x))  # [batch_size, seq_len, embed_dim]
        out, _ = self.lstm(emb)  # [batch_size, seq_len, hidden_dim * 2]

        # Masked Average Pooling
        sum_pooled = torch.sum(out * mask, dim=1)
        lengths = torch.clamp(mask.sum(dim=1), min=1.0)
        avg_pool = sum_pooled / lengths

        # Masked Max Pooling
        masked_out = out.masked_fill(mask == 0, -1e9)
        max_pool, _ = torch.max(masked_out, dim=1)

        # Concatenate poolings
        concat = torch.cat([avg_pool, max_pool], dim=1)
        logits = self.fc(concat)
        return logits


def train_and_evaluate_bilstm(
    data_dir: str = "dataset/processed",
    models_dir: str = "models",
    results_dir: str = "results/outputs",
    epochs: int = 6,
    batch_size: int = 64
) -> Dict[str, Any]:
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(results_dir, exist_ok=True)

    train_df = pd.read_csv(os.path.join(data_dir, "train.csv"))
    val_df = pd.read_csv(os.path.join(data_dir, "val.csv"))
    test_df = pd.read_csv(os.path.join(data_dir, "test.csv"))

    print(f"[BiLSTM] Building vocabulary on {len(train_df)} training samples...")
    tokenizer = SubwordCharTokenizer(max_vocab=15000)
    tokenizer.fit(train_df["text"].fillna("").tolist())
    vocab_path = os.path.join(models_dir, "bilstm_vocab.json")
    tokenizer.save(vocab_path)
    print(f"[BiLSTM] Vocab size: {len(tokenizer.token2id)}, saved to {vocab_path}")

    train_ds = TextClassificationDataset(
        train_df["text"].fillna("").tolist(),
        [LABEL_TO_ID[l] for l in train_df["label"]],
        tokenizer
    )
    val_ds = TextClassificationDataset(
        val_df["text"].fillna("").tolist(),
        [LABEL_TO_ID[l] for l in val_df["label"]],
        tokenizer
    )

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    model = MultilingualBiLSTM(vocab_size=len(tokenizer.token2id), embed_dim=128, hidden_dim=128, num_classes=3).to(DEVICE)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    print(f"[BiLSTM] Starting training on {DEVICE} for {epochs} epochs...")
    best_val_f1 = 0.0
    history: List[Dict[str, Any]] = []
    t_start = time.time()

    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        for x_b, y_b in train_loader:
            x_b, y_b = x_b.to(DEVICE), y_b.to(DEVICE)
            optimizer.zero_grad()
            logits = model(x_b)
            loss = criterion(logits, y_b)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        train_loss /= len(train_loader)

        # Validation
        model.eval()
        val_loss = 0.0
        all_preds = []
        all_targets = []
        with torch.no_grad():
            for x_v, y_v in val_loader:
                x_v, y_v = x_v.to(DEVICE), y_v.to(DEVICE)
                logits = model(x_v)
                loss = criterion(logits, y_v)
                val_loss += loss.item()
                preds = torch.argmax(logits, dim=-1).cpu().numpy()
                all_preds.extend(preds)
                all_targets.extend(y_v.cpu().numpy())

        val_loss /= len(val_loader)
        val_f1 = f1_score(all_targets, all_preds, average="macro")
        val_acc = accuracy_score(all_targets, all_preds)

        print(f"Epoch {epoch}/{epochs} - Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.4f} | Val F1: {val_f1:.4f}")

        history.append({
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "val_loss": round(val_loss, 4),
            "val_accuracy": round(val_acc, 4),
            "val_macro_f1": round(val_f1, 4)
        })

        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            torch.save(model.state_dict(), os.path.join(models_dir, "bilstm.pt"))

    train_time = round(time.time() - t_start, 2)
    print(f"[BiLSTM] Training complete in {train_time}s. Best Val F1: {best_val_f1:.4f}")

    # Load best weights for test evaluation
    model.load_state_dict(torch.load(os.path.join(models_dir, "bilstm.pt"), map_location=DEVICE))
    model.eval()

    # Evaluation on Held-Out Test Set
    test_texts = test_df["text"].fillna("").tolist()
    y_test = np.array([LABEL_TO_ID[l] for l in test_df["label"].tolist()])
    test_ds = TextClassificationDataset(test_texts, y_test.tolist(), tokenizer)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)

    t0 = time.perf_counter()
    test_preds = []
    test_probs = []
    with torch.no_grad():
        for x_t, _ in test_loader:
            x_t = x_t.to(DEVICE)
            logits = model(x_t)
            probs = torch.softmax(logits, dim=-1).cpu().numpy()
            preds = np.argmax(probs, axis=1)
            test_preds.extend(preds)
            test_probs.extend(probs)
    total_latency_sec = time.perf_counter() - t0
    latency_ms = round((total_latency_sec / len(test_texts)) * 1000, 3)

    test_preds = np.array(test_preds)
    test_acc = round(accuracy_score(y_test, test_preds), 4)
    macro_f1 = round(f1_score(y_test, test_preds, average="macro"), 4)
    weighted_f1 = round(f1_score(y_test, test_preds, average="weighted"), 4)
    prec_macro = round(precision_score(y_test, test_preds, average="macro"), 4)
    rec_macro = round(recall_score(y_test, test_preds, average="macro"), 4)

    # Per-class metrics
    class_rep = classification_report(y_test, test_preds, target_names=CANONICAL_CLASSES, output_dict=True)
    per_class_f1 = {cls: round(class_rep[cls]["f1-score"], 4) for cls in CANONICAL_CLASSES}
    cm = confusion_matrix(y_test, test_preds, labels=[0, 1, 2]).tolist()

    # Per-language breakdown
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
        "model_name": "Deep Learning BiLSTM (Subword-Aware PyTorch)",
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

    res_path = os.path.join(results_dir, "bilstm_results.json")
    with open(res_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("\n================== BiLSTM SUMMARY ==================")
    print(f"BiLSTM Test Macro F1: {macro_f1} (Accuracy: {test_acc}, Latency: {latency_ms}ms)")
    print("====================================================")

    return results


if __name__ == "__main__":
    train_and_evaluate_bilstm(epochs=6)
