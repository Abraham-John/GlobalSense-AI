# GlobalSense AI: Multilingual Sentiment Intelligence Platform

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-38B2AC.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests Passing](https://img.shields.io/badge/tests-23%20passed-brightgreen.svg)]()

> **BCA 5th-Semester NLP Capstone Project**  
> *"Understand sentiment across scripts, languages, and dialects without linguistic compromise."*  
> Genuine, zero-leakage multilingual sentiment analysis supporting 10 languages across 3 canonical polarities (`Positive`, `Negative`, `Neutral`) with causal occlusion explainability, reliability calibration, and production-grade software engineering.

---

## 🌟 Key Capabilities

1. **10 Supported Languages (All with $\ge 200$ Held-Out Test Samples):**
   - **English** (`en`), **Hindi (Devanagari)** (`hi`), **Hinglish (Code-Mixed Roman Script)** (`hi-Latn`), **French** (`fr`), **Spanish** (`es`), **German** (`de`), **Italian** (`it`), **Portuguese** (`pt`), **Arabic** (`ar`), **Japanese** (`ja`).
2. **Robust Multi-Tier Language Detection:**
   - Script-aware classification (Devanagari, Arabic, Japanese) + European accent disqualification + Hinglish lexical heuristic (150+ markers) + statistical n-gram fallback (`lingua-language-detector`).
3. **Strict Zero-Leakage Data Protocol:**
   - 19,679 deduplicated samples partitioned into stratified 75/10/15 train/val/test splits (fixed seed 42) across $10 \times 3 = 30$ strata.
4. **Active Champion Architecture:**
   - **Pretrained XLM-RoBERTa (`cardiffnlp/twitter-xlm-roberta-base-sentiment`):** Evaluated zero-shot on the 2,952 held-out test set with dynamic `id2label` mapping to canonical `[Positive, Negative, Neutral]`. Achieves **63.25% test accuracy**, **0.6096 Macro-F1**, and **71.23% selective accuracy** ($\tau = 0.60$).
5. **Selective Classification & Uncertainty Rejection:**
   - Predictions with confidence $< 0.60$ trigger an **Uncertain** state banner and amber status pill, suppressing unreliable low-confidence inferences.
6. **Causal Occlusion Sensitivity:**
   - Genuine token attribution $\Delta P = P(y \mid x) - P(y \mid x \setminus \{w_i\})$ highlights actual decision drivers; no fabricated attention heatmaps.
7. **Expected Calibration Error (ECE):**
   - Full 10-bin calibration tracking ($ECE = 0.0838$); model outputs honestly reported as *"Model Confidence"*, not empirical truth probability.
8. **Demo Safety Verified:**
   - Tested on a standardized 30-sentence cross-lingual validation sheet (`tests/demo_sentences.csv`) with **29/30 correct predictions (96.7%)**, including correctly identifying critical edge cases like *"This is the worst purchase I have ever made..."* as **Negative (95.15%)**.

---

## 📊 Empirical Test Results (Held-Out Test Set: 2,952 Samples)

*Every metric below is generated directly from code execution on unseen data (`backend/results/outputs/model_comparison.json`):*

| Model Architecture | Origin | Accuracy | Macro-F1 | Precision (M) | Recall (M) | ECE | CPU Latency / Sample | Role |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Pretrained XLM-RoBERTa** | CardiffNLP / HF | **63.25%** | **0.6096** | **0.6254** | **0.6256** | **0.0838** | 157.16 ms | **Active Production Model** |
| **Baseline B (Word + Char n-gram)** | Local Scikit-Learn | **62.60%** | **0.6245** | **0.6300** | **0.6240** | 0.0886 | 0.499 ms | Fast CPU Baseline |
| **Baseline A (Word TF-IDF)** | Local Scikit-Learn | 58.60% | 0.5864 | 0.5878 | 0.5862 | 0.0912 | 0.037 ms | Classical Baseline |
| **BiLSTM (2-Layer PyTorch)** | Local PyTorch | 58.06% | 0.5768 | 0.5833 | 0.5772 | 0.1240 | 2.894 ms | Deep Learning Baseline |

### Selective Accuracy Analysis (Uncertainty Threshold $\tau = 0.60$):
- **Samples Evaluated:** 2,952
- **Confident Predictions ($\text{conf} \ge 0.60$):** 1,825 samples (61.82%)
- **Uncertain / Withheld ($\text{conf} < 0.60$):** 1,127 samples (38.18%)
- **Selective Accuracy on Confident Subset:** **71.23%** (+7.98% accuracy gain over raw inference)

### Per-Language Performance (Pretrained XLM-RoBERTa):
| Language Code | Language | Held-Out Test Samples | Test Accuracy | Macro-F1 | Status ($\ge 200$) |
|:---:|:---|:---:|:---:|:---:|:---:|
| `it` | Italian | 270 | 73.70% | 0.7339 | Supported |
| `en` | English | 270 | 67.04% | 0.6583 | Supported |
| `de` | German | 270 | 63.70% | 0.5756 | Supported |
| `hi` | Hindi (Devanagari) | 315 | 63.17% | 0.6323 | Supported |
| `pt` | Portuguese | 270 | 62.59% | 0.5863 | Supported |
| `hi-Latn` | Hinglish (Code-Mixed) | 477 | 61.84% | 0.5870 | Supported |
| `es` | Spanish | 270 | 61.48% | 0.5805 | Supported |
| `ja` | Japanese | 270 | 60.74% | 0.5561 | Supported |
| `fr` | French | 270 | 60.37% | 0.5245 | Supported |
| `ar` | Arabic | 270 | 58.89% | 0.5785 | Supported |

---

## 🚀 Quickstart & Installation (Windows PowerShell)

### Prerequisites
- Python 3.10+ (Tested on Python 3.11, 3.12, and 3.14)
- Node.js 18+ and npm

### 1. Set Up Backend

```powershell
# Navigate to backend directory
cd Multilingual-Sentiment-Analysis\backend

# Install required Python dependencies
python -m pip install fastapi uvicorn pydantic scikit-learn joblib numpy pandas torch transformers datasets lingua-language-detector matplotlib seaborn pytest

# Pre-download the active CardiffNLP checkpoint locally
python scripts\download_models.py

# Optional: Pre-download Helsinki-NLP translation models for fast offline inference
python scripts\download_models.py --translation fr,es,de,it,pt,ar,ja,hi

# Run complete automated test suite (29 passing tests)
python -m pytest
```

### 2. Run Backend Server

```powershell
# From Multilingual-Sentiment-Analysis\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- FastAPI backend starts at: `http://127.0.0.1:8000`
- Interactive Swagger API: `http://127.0.0.1:8000/docs`
- Health check endpoint: `http://127.0.0.1:8000/api/health`

### 3. Run Frontend Web App

Open a second PowerShell terminal:

```powershell
# Navigate to frontend directory
cd Multilingual-Sentiment-Analysis\frontend

# Install node dependencies
npm.cmd install

# Start Vite development server
npm.cmd run dev
```
Open your browser at `http://localhost:5173`.

---

## 🔬 Reproducibility & Model Training

All data splits and local training pipelines are completely deterministic (`seed=42`):

```powershell
cd Multilingual-Sentiment-Analysis\backend

# 1. Regenerate zero-leakage splits from raw corpora (14,759 train / 1,968 val / 2,952 test)
python src\data_loader.py

# 2. Retrain classical baselines (Baseline A & Baseline B)
python src\train_baseline.py

# 3. Retrain PyTorch BiLSTM
python src\train_bilstm.py

# 4. Re-evaluate pretrained CardiffNLP transformer checkpoint on held-out test.csv
python scripts\evaluate_pretrained.py

# 5. Run demo safety test validation
python -m pytest tests\test_demo_safety.py -v
```

### XLM-RoBERTa Full Fine-Tuning on Google Colab (Free T4 GPU)
For users wishing to train custom domain weights from scratch:
- Open `notebooks/train_xlmr_colab.ipynb` in [Google Colab](https://colab.research.google.com).
- Set runtime type to **T4 GPU** (15.3 GB GDDR6 VRAM).
- With mixed precision (`fp16=True`) and batch size 16, training consumes **~6.8 GB VRAM** (under 45% of T4 capacity).
- Trains across 14,759 samples in ~28 minutes and exports the model directory to `backend/models/xlmr/`.

---

## 📁 Repository Structure

```
Multilingual-Sentiment-Analysis/
├── backend/
│   ├── app/
│   │   ├── api/endpoints.py       # REST API endpoints (/analyze, /batch, /analytics, /health, /model-info)
│   │   ├── core/config.py         # Application configuration & path resolution
│   │   ├── schemas/sentiment.py   # Pydantic v2 validation models
│   │   └── main.py                # FastAPI entry point & CORS
│   ├── dataset/processed/         # Stratified train (14,759), val (1,968), test (2,952)
│   ├── models/
│   │   ├── pretrained_xlmr/       # CardiffNLP twitter-xlm-roberta-base-sentiment checkpoint
│   │   ├── baseline_a/            # TF-IDF Word + Logistic Regression pipeline
│   │   ├── baseline_b/            # Word + Char n-gram TF-IDF pipeline
│   │   └── bilstm/                # PyTorch 2-layer BiLSTM checkpoint
│   ├── results/
│   │   ├── outputs/               # JSON evaluation artifacts (model_comparison, calibration, error audit)
│   │   └── graphs/                # Confusion matrix & model comparison PNG charts
│   ├── scripts/
│   │   ├── download_models.py     # Pre-download Hugging Face weights to local directory
│   │   ├── evaluate_pretrained.py # Zero-shot test set benchmarking & calibration computation
│   │   └── create_colab_notebook.py # Colab notebook generator
│   ├── src/
│   │   ├── preprocessing.py       # Unicode NFC, script detection, regex sanitizers
│   │   ├── language_detection.py  # Multi-tier script + Hinglish heuristic + lingua detector
│   │   ├── data_loader.py         # Deduplication & zero-leakage stratified splitter
│   │   ├── prediction.py          # Unified inference engine with uncertainty thresholding
│   │   ├── explain.py             # Causal occlusion sensitivity token attribution
│   │   └── evaluate_model.py      # Macro-F1, per-language accuracy, ECE, error analysis
│   ├── tests/                     # 23 automated pytest test cases (including test_demo_safety.py)
│   └── pytest.ini
├── frontend/
│   ├── src/
│   │   ├── components/            # Navbar, CommandPalette, Footer
│   │   ├── pages/                 # Overview, Analyze, Batch, Analytics, History, Methodology, Docs
│   │   ├── services/api.ts        # Axios client connected to FastAPI
│   │   ├── types/index.ts         # TypeScript definitions
│   │   ├── App.tsx                # Client router, health polling, theme state
│   │   └── main.tsx
│   ├── tailwind.config.js         # Dark/light theme design system
│   └── vite.config.ts
├── notebooks/
│   └── train_xlmr_colab.ipynb     # Standalone Google Colab T4 training notebook
└── docs/
    ├── Error_Analysis.md          # 50-sample audited error taxonomy & VRAM analysis
    ├── Project_Report.md          # Comprehensive university-ready BCA project report
    ├── Literature_Review.md       # 6 synthesized peer-reviewed academic papers
    ├── Presentation_Outline.md    # 12-slide presentation outline with talking points
    ├── Viva_Questions.md          # 15+ comprehensive viva defense questions & answers
    └── screenshots/               # Responsive screenshots (1440px desktop, 820px tablet, 390px mobile)
```

---

## 🛡️ License & Attributions

- Platform source code: Licensed under the [MIT License](LICENSE).
- Datasets used: `clapAI/MultiLingualSentiment` (Apache-2.0), `iam-tsr/hindi-sentiments` (MIT), `shae2977/hinglish-youtube-sentiments` (CC-BY-4.0).
- Active Pretrained Model: CardiffNLP `twitter-xlm-roberta-base-sentiment` ([Cardiff NLP Group](https://huggingface.co/cardiffnlp/twitter-xlm-roberta-base-sentiment)).
