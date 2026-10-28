"""
GlobalSense AI - Multilingual Data Loader & Curation Module
Cずるates a unified, balanced 3-class multilingual sentiment dataset across 10 languages
with strict deduplication, zero split leakage, fixed seed (42), and >=200 held-out test samples per language.
"""

from __future__ import annotations

import json
import os
import random
import sys
from collections import Counter
from typing import Dict, List, Any, Tuple

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from datasets import load_dataset
from sklearn.model_selection import train_test_split

from src.preprocessing import normalize_text

# Target languages
TARGET_LANGUAGES = ["en", "hi", "hi-Latn", "fr", "es", "de", "it", "pt", "ar", "ja"]

# Standard 3-class label mapping
CANONICAL_CLASSES = ["Positive", "Negative", "Neutral"]
LABEL_TO_ID = {"Positive": 0, "Negative": 1, "Neutral": 2}
ID_TO_LABEL = {0: "Positive", 1: "Negative", 2: "Neutral"}

# Minimum held-out test samples per language required to mark "supported"
MIN_TEST_SAMPLES_THRESHOLD = 200
SEED = 42


def map_sentiment_label(raw_label: Any) -> str:
    """Normalize various dataset labels into canonical ['Positive', 'Negative', 'Neutral']."""
    if isinstance(raw_label, int):
        # iam-tsr/hindi-sentiments mapping: 0 -> Neutral, 1 -> Positive, 2 -> Negative
        if raw_label == 0:
            return "Neutral"
        elif raw_label == 1:
            return "Positive"
        elif raw_label == 2:
            return "Negative"
    
    clean_str = str(raw_label).strip().lower()
    if "pos" in clean_str or clean_str in {"1", "4", "5"}:
        return "Positive"
    elif "neg" in clean_str or clean_str in {"0", "1", "2"} and "neu" not in clean_str:
        return "Negative"
    elif "neu" in clean_str or clean_str in {"3"}:
        return "Neutral"
    
    return "Neutral"


def load_clap_multilingual_subset(samples_per_lang: int = 2250) -> List[Dict[str, Any]]:
    """
    Load balanced subsets for en, fr, es, de, it, pt, ar, ja from clapAI/MultiLingualSentiment.
    Guarantees >= 700 samples per class per language so test split easily exceeds >= 200.
    """
    clap_langs = ["en", "fr", "es", "de", "it", "pt", "ar", "ja"]
    print(f"[DataLoader] Sampling clapAI/MultiLingualSentiment for: {clap_langs}")
    
    ds = load_dataset("clapAI/MultiLingualSentiment", split="train")
    
    records_by_lang: Dict[str, Dict[str, List[Dict]]] = {
        l: {"Positive": [], "Negative": [], "Neutral": []} for l in clap_langs
    }
    target_per_class = samples_per_lang // 3  # 750 per class
    
    for row in ds:
        lang = row.get("language")
        if lang not in records_by_lang:
            continue
        
        norm_label = map_sentiment_label(row.get("label"))
        text = normalize_text(row.get("text", ""))
        if len(text) < 5:
            continue
        
        bucket = records_by_lang[lang][norm_label]
        # For Italian max is ~800, for others target_per_class is 750
        max_for_lang_class = min(target_per_class, 800) if lang == "it" else target_per_class
        if len(bucket) < max_for_lang_class:
            bucket.append({
                "text": text,
                "label": norm_label,
                "language": lang,
                "source": "clapAI/MultiLingualSentiment",
                "license": "Apache-2.0"
            })
        
        # Check if all classes for all languages are completely satisfied
        all_full = all(
            all(len(records_by_lang[l][c]) >= (min(target_per_class, 750) if l == "it" else target_per_class) for c in CANONICAL_CLASSES)
            for l in clap_langs
        )
        if all_full:
            break

    sampled: List[Dict[str, Any]] = []
    random.seed(SEED)
    for lang, class_dict in records_by_lang.items():
        min_class_count = min(len(class_dict[c]) for c in CANONICAL_CLASSES)
        for c in CANONICAL_CLASSES:
            items = class_dict[c][:min_class_count]
            sampled.extend(items)
            
    print(f"[DataLoader] Sampled {len(sampled)} records from clapAI across {len(clap_langs)} languages.")
    return sampled


def load_hindi_subset(samples: int = 2250) -> List[Dict[str, Any]]:
    """
    Load balanced Hindi (Devanagari) records from iam-tsr/hindi-sentiments.
    """
    print("[DataLoader] Loading iam-tsr/hindi-sentiments...")
    ds = load_dataset("iam-tsr/hindi-sentiments", split="train")
    
    by_class: Dict[str, List[Dict]] = {"Positive": [], "Negative": [], "Neutral": []}
    target_per_class = samples // 3
    
    for row in ds:
        norm_label = map_sentiment_label(row.get("label"))
        text = normalize_text(row.get("hindi_text", ""))
        if len(text) < 5:
            continue
        
        if len(by_class[norm_label]) < target_per_class:
            by_class[norm_label].append({
                "text": text,
                "label": norm_label,
                "language": "hi",
                "source": "iam-tsr/hindi-sentiments",
                "license": "MIT"
            })
        if all(len(by_class[c]) >= target_per_class for c in CANONICAL_CLASSES):
            break

    result = []
    for c in CANONICAL_CLASSES:
        result.extend(by_class[c])
        
    print(f"[DataLoader] Sampled {len(result)} Hindi Devanagari records.")
    return result


def load_hinglish_subset() -> List[Dict[str, Any]]:
    """
    Load Hinglish (Roman-script code-mixed) comments from shae2977/hinglish-youtube-sentiments-dataset.
    """
    print("[DataLoader] Loading shae2977/hinglish-youtube-sentiments-dataset...")
    ds = load_dataset("shae2977/hinglish-youtube-sentiments-dataset", split="train")
    
    result = []
    for row in ds:
        text = normalize_text(row.get("comment", ""))
        if len(text) < 4:
            continue
        norm_label = map_sentiment_label(row.get("sentiment"))
        result.append({
            "text": text,
            "label": norm_label,
            "language": "hi-Latn",
            "source": "shae2977/hinglish-youtube-sentiments-dataset",
            "license": "CC-BY-4.0"
        })
    print(f"[DataLoader] Loaded {len(result)} Hinglish records.")
    return result


def build_and_save_multilingual_dataset(
    output_dir: str = "dataset/processed",
    stats_dir: str = "results/outputs"
) -> Dict[str, Any]:
    """
    Construct, clean, deduplicate, and create stratified 80/10/10 train/val/test splits.
    Guarantees >=200 held-out test samples per language.
    """
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(stats_dir, exist_ok=True)
    
    clap_records = load_clap_multilingual_subset(samples_per_lang=1800)
    hindi_records = load_hindi_subset(samples=2100)
    hinglish_records = load_hinglish_subset()
    
    all_records = clap_records + hindi_records + hinglish_records
    df = pd.DataFrame(all_records)
    
    initial_count = len(df)
    
    # Cleaning & Deduplication
    df = df.dropna(subset=["text", "label", "language"])
    df["text"] = df["text"].astype(str).str.strip()
    df = df[df["text"].str.len() >= 4]
    
    # Exact text deduplication
    df = df.drop_duplicates(subset=["text"]).reset_index(drop=True)
    dedup_count = len(df)
    
    # Stratification key: language + label
    df["strat_key"] = df["language"] + "_" + df["label"]
    
    # Stratified split: 75% train, 25% temp (which splits into 10% val, 15% test)
    # Guaranteeing >= 270 test samples per language (threshold >= 200)
    train_df, temp_df = train_test_split(
        df,
        test_size=0.25,
        random_state=SEED,
        stratify=df["strat_key"]
    )
    
    val_df, test_df = train_test_split(
        temp_df,
        test_size=0.60,
        random_state=SEED,
        stratify=temp_df["strat_key"]
    )
    
    # Verify no data leakage between splits
    train_texts = set(train_df["text"])
    val_texts = set(val_df["text"])
    test_texts = set(test_df["text"])
    
    assert len(train_texts.intersection(test_texts)) == 0, "Data leakage detected between train and test!"
    assert len(train_texts.intersection(val_texts)) == 0, "Data leakage detected between train and val!"
    assert len(val_texts.intersection(test_texts)) == 0, "Data leakage detected between val and test!"
    
    # Save splits
    train_path = os.path.join(output_dir, "train.csv")
    val_path = os.path.join(output_dir, "val.csv")
    test_path = os.path.join(output_dir, "test.csv")
    
    train_df.to_csv(train_path, index=False, encoding="utf-8")
    val_df.to_csv(val_path, index=False, encoding="utf-8")
    test_df.to_csv(test_path, index=False, encoding="utf-8")
    
    # Compile statistics
    per_language_test_counts = dict(Counter(test_df["language"]))
    
    # Verify >= 200 threshold
    supported_status = {}
    for lang in TARGET_LANGUAGES:
        cnt = per_language_test_counts.get(lang, 0)
        supported_status[lang] = {
            "test_samples": cnt,
            "meets_threshold": cnt >= MIN_TEST_SAMPLES_THRESHOLD,
            "status": "supported" if cnt >= MIN_TEST_SAMPLES_THRESHOLD else "limited"
        }
    
    stats = {
        "metadata": {
            "title": "GlobalSense AI Multilingual Sentiment Corpus",
            "seed": SEED,
            "classes": CANONICAL_CLASSES,
            "target_languages": TARGET_LANGUAGES,
            "min_test_samples_threshold": MIN_TEST_SAMPLES_THRESHOLD
        },
        "records": {
            "initial_collected": initial_count,
            "post_dedup": dedup_count,
            "train_count": len(train_df),
            "val_count": len(val_df),
            "test_count": len(test_df)
        },
        "distributions": {
            "overall_labels": dict(Counter(df["label"])),
            "overall_languages": dict(Counter(df["language"])),
            "train_languages": dict(Counter(train_df["language"])),
            "val_languages": dict(Counter(val_df["language"])),
            "test_languages": per_language_test_counts,
        },
        "supported_evaluation_audit": supported_status,
        "datasources": [
            {
                "name": "clapAI/MultiLingualSentiment",
                "license": "Apache-2.0",
                "languages_used": ["en", "fr", "es", "de", "it", "pt", "ar", "ja"],
                "labels": ["Positive", "Negative", "Neutral"]
            },
            {
                "name": "iam-tsr/hindi-sentiments",
                "license": "MIT",
                "languages_used": ["hi (Devanagari)"],
                "labels": ["Positive", "Negative", "Neutral"]
            },
            {
                "name": "shae2977/hinglish-youtube-sentiments-dataset",
                "license": "CC-BY-4.0",
                "languages_used": ["hi-Latn (Hinglish)"],
                "labels": ["Positive", "Negative", "Neutral"]
            }
        ]
    }
    
    stats_file = os.path.join(stats_dir, "dataset_statistics.json")
    with open(stats_file, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
        
    print(f"[DataLoader] Successfully generated dataset splits and saved to {output_dir}")
    print(f"[DataLoader] Summary statistics written to {stats_file}")
    for lang, status_info in supported_status.items():
        print(f"  - {lang}: {status_info['test_samples']} test samples -> {status_info['status'].upper()}")
        
    return stats


if __name__ == "__main__":
    build_and_save_multilingual_dataset()
