"""
GlobalSense AI / GlobalSense AI - Pre-download Pretrained Checkpoints
Downloads pretrained multilingual checkpoints to local directory models/pretrained_xlmr/
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Resolve root backend path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from transformers import AutoTokenizer, AutoModelForSequenceClassification

DEFAULT_MODEL_ID = "cardiffnlp/twitter-xlm-roberta-base-sentiment"
TARGET_DIR = BACKEND_DIR / "models" / "pretrained_xlmr"


def download_pretrained_model(model_id: str = DEFAULT_MODEL_ID, target_dir: Path = TARGET_DIR) -> bool:
    print("=" * 70)
    print(f"Downloading Pretrained Checkpoint: {model_id}")
    print(f"Target Destination: {target_dir}")
    print("=" * 70)

    target_dir.mkdir(parents=True, exist_ok=True)

    import requests
    import time
    
    files_to_download = [
        "config.json",
        "sentencepiece.bpe.model",
        "special_tokens_map.json",
        "tokenizer.json",
        "pytorch_model.bin"
    ]
    
    base_url = f"https://huggingface.co/{model_id}/resolve/main"
    
    for filename in files_to_download:
        dest_path = target_dir / filename
        if dest_path.exists() and dest_path.stat().st_size > 0:
            print(f" -> {filename} already exists ({round(dest_path.stat().st_size / (1024*1024), 2)} MB). Skipping.")
            continue
            
        file_url = f"{base_url}/{filename}"
        print(f"Downloading {filename} from {file_url}...")
        try:
            with requests.get(file_url, stream=True, timeout=60) as r:
                if r.status_code == 404:
                    print(f" -> {filename} not present in repository (404), skipping.")
                    continue
                r.raise_for_status()
                total_size = int(r.headers.get("content-length", 0))
                downloaded = 0
                start_time = time.time()
                
                with open(dest_path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=4 * 1024 * 1024):  # 4 MB chunks
                        if chunk:
                            f.write(chunk)
                            downloaded += len(chunk)
                            if total_size > 0:
                                percent = (downloaded / total_size) * 100
                                mb = downloaded / (1024 * 1024)
                                total_mb = total_size / (1024 * 1024)
                                speed = mb / max(time.time() - start_time, 0.001)
                                sys.stdout.write(f"\r -> {filename}: {mb:.1f} / {total_mb:.1f} MB ({percent:.1f}%) @ {speed:.2f} MB/s")
                                sys.stdout.flush()
                print(f"\n -> Successfully downloaded {filename}")
        except Exception as e:
            print(f"\nERROR downloading {filename}: {e}", file=sys.stderr)
            if dest_path.exists():
                dest_path.unlink()
            return False

    print("=" * 70)
    print(f"SUCCESS: Model {model_id} cached at {target_dir}")
    print("Backend can now load offline without network latency.")
    print("=" * 70)
    return True


def download_translation_models(languages: str, base_dir: Path) -> bool:
    """Download Helsinki-NLP opus-mt translation models."""
    from src.translation import OPUS_MT_MODELS
    from transformers import MarianTokenizer, MarianMTModel

    if languages.strip().lower() == "all":
        target_langs = list(OPUS_MT_MODELS.keys())
    else:
        target_langs = [l.strip() for l in languages.split(",") if l.strip()]

    print("=" * 70)
    print(f"Downloading Translation Models: {target_langs}")
    print("=" * 70)

    all_ok = True
    for lang in target_langs:
        if lang not in OPUS_MT_MODELS:
            print(f"[!] Language '{lang}' not in OPUS_MT_MODELS, skipping.")
            continue
        model_id = OPUS_MT_MODELS[lang]
        dest_dir = base_dir / "models" / "opus_mt" / lang
        if dest_dir.exists() and any(dest_dir.iterdir()):
            print(f" -> {lang} ({model_id}) already exists at {dest_dir}. Skipping.")
            continue

        print(f"Downloading {lang} model: {model_id} -> {dest_dir}...")
        try:
            tokenizer = MarianTokenizer.from_pretrained(model_id)
            model = MarianMTModel.from_pretrained(model_id)
            dest_dir.mkdir(parents=True, exist_ok=True)
            tokenizer.save_pretrained(str(dest_dir))
            model.save_pretrained(str(dest_dir))
            print(f" -> Successfully saved {lang} ({model_id})")
        except Exception as e:
            print(f"ERROR downloading translation model for {lang}: {e}")
            all_ok = False

    return all_ok


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Download pretrained multilingual sentiment and translation checkpoints")
    parser.add_argument("--model_id", type=str, default=DEFAULT_MODEL_ID, help="Hugging Face model ID")
    parser.add_argument("--target_dir", type=str, default=str(TARGET_DIR), help="Output folder")
    parser.add_argument("--translation", type=str, default=None, help="Comma-separated lang codes or 'all' to pre-download translation models")
    args = parser.parse_args()

    if args.translation:
        success = download_translation_models(args.translation, BACKEND_DIR)
        sys.exit(0 if success else 1)
    else:
        success = download_pretrained_model(args.model_id, Path(args.target_dir))
        sys.exit(0 if success else 1)
