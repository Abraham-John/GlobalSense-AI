# Original Project Analysis: CineSense AI (Movie-Sentiment-Analysis)

**Reference Repository:** `https://github.com/Abraham-John/Movie-Sentiment-Analysis`  
**Inspected Path:** `reference/Movie-Sentiment-Analysis/`  
**Analysis Date:** 2026-10-27  
**Analyst:** GlobalSense AI Engineering Team  

---

## 1. Executive Summary

The reference repository **CineSense AI** (`Movie-Sentiment-Analysis`) is a Python application built around a deep learning LSTM model trained on the standard English Keras IMDB movie review dataset. It pairs an offline-trained TensorFlow/Keras neural network (`lstm_imdb.h5`) with a Streamlit web application featuring Plotly charts, session-state history, and rule-based cosmetic text analytics.

While the project demonstrates a clean presentation layer for binary English movie reviews, it possesses fundamental architectural limitations that prevent it from functioning as a production-grade, multilingual, 3-class sentiment platform.

---

## 2. Technical Stack & Framework Breakdown

| Component | Technology / Library | Version / Detail |
|---|---|---|
| **Language** | Python | 3.10+ compatible |
| **Deep Learning Framework** | TensorFlow / Keras | Keras 2.15.0 (`Sequential` API) |
| **Model Architecture** | Embedding + LSTM + Dense | Single-layer LSTM (128 units) with recurrent dropout |
| **Dataset Source** | `keras.datasets.imdb` | 50,000 English movie reviews (25k train, 25k test) |
| **Frontend UI** | Streamlit | Streamlit with custom CSS (`assets/style.css`) |
| **Visualizations** | Plotly Express & Graph Objects | Donut gauges, probability bars, timeline charts |
| **Data Handling** | NumPy & Pandas | Array manipulation and session history export (CSV/Excel/JSON/TXT) |
| **Model Persistence** | Keras HDF5 format | `models/lstm_imdb.h5` |

---

## 3. In-Depth Pipeline Inspection

### 3.1 Dataset Loading
- Loaded via `tensorflow.keras.datasets.imdb.load_data(num_words=10000)`.
- Pre-tokenized English reviews where tokens are represented by integer indices corresponding to word frequency ranks in the IMDB corpus.
- No raw text dataset or multilingual corpora were used in training.

### 3.2 Text Cleaning & Preprocessing
- Real-time review preprocessing is located in `utils/preprocessing.py`:
  ```python
  words = text.lower().split()
  encoded = []
  for word in words:
      index = word_index.get(word)
      if index is not None and index < 10000:
          encoded.append(index + 3)
      else:
          encoded.append(2)  # UNK token
  ```
- **Observations:**
  - Tokenization is purely whitespace-based (`.split()`), assuming space-separated Latin tokens.
  - Punctuation is not normalized; words with attached punctuation (e.g., `"masterpiece!"`) fail exact index lookup and fall back to UNK (`2`).
  - Index offset of `+3` accommodates reserved tokens: `0: <PAD>`, `1: <START>`, `2: <UNK>`.

### 3.3 Vectorization & Padding
- Sequences are padded/truncated to a fixed length of 500 tokens using:
  ```python
  padded = pad_sequences([encoded], maxlen=500, padding="pre", truncating="pre")
  ```
- Any review shorter than 500 words is left-padded with zeros; longer reviews lose their introductory context.

### 3.4 Model Architecture & Classifier
- As documented in `notebooks/lstm.ipynb`:
  - `Embedding(input_dim=10000, output_dim=128, input_length=500)`
  - `LSTM(128, dropout=0.2, recurrent_dropout=0.2)`
  - `Dropout(0.5)`
  - `Dense(64, activation="relu")`
  - `Dropout(0.3)`
  - `Dense(1, activation="sigmoid")`
- Loss function: `binary_crossentropy`
- Optimizer: `Adam`
- Callbacks: `EarlyStopping(monitor="val_accuracy", patience=3)` and `ModelCheckpoint("lstm_imdb.h5")`.

### 3.5 Training & Prediction Flow
- Training is executed across 10 epochs with a 20% validation split.
- Inference in `utils/prediction.py`:
  - Computes `raw_prediction = float(model.predict(padded)[0][0])`.
  - Binary threshold: `raw_prediction >= 0.5` yields "Positive", else "Negative".
  - Confidence calculation: `raw_prediction if is_positive else 1 - raw_prediction`.

### 3.6 Explainability & Review Statistics
- The "AI Explanation" feature is not model-driven attribution (such as Integrated Gradients, SHAP, or Occlusion). Instead, it relies on static dictionary lookups (`POSITIVE_WORDS` and `NEGATIVE_WORDS` sets in `utils/preprocessing.py`) and generates template strings based on word counts.
- Emotion intensities (Happy, Angry, Sad, Excited, Neutral) are computed using basic ratio multipliers against keyword lists.

---

## 4. Critical Limitations for Multilingual & 3-Class Sentiment

The original implementation faces seven severe architectural roadblocks:

1. **Total Incompatibility with Non-Latin Scripts (Devanagari, Arabic, Japanese):**
   The vocabulary is frozen to the top 10,000 English tokens from IMDB. Any text written in Hindi (`यह फिल्म बहुत अच्छी है`), Arabic (`هذا الفيلم رائع جدا`), or Japanese (`この映画は本当に素晴らしかった`) contains zero matching vocabulary keys. Every word maps to token `2` (`<UNK>`). The padded input becomes `[2, 2, 2, ...]`, yielding purely spurious predictions.

2. **Failure on Code-Mixed & Transliterated Text (Hinglish):**
   Hinglish relies on Latin script phonetics (`ye movie sach me bohot acchi thi`). Words like `bohot`, `acchi`, `sach` are absent from English IMDB, leading to heavy out-of-vocabulary (OOV) collapse.

3. **Strict Binary Classification (No Neutral Sentiment):**
   The final layer is `Dense(1, activation="sigmoid")`. Real-world sentiment, customer feedback, and reviews frequently express neutral, objective, or balanced stances. A forced binary choice produces extreme misclassifications on objective statements.

4. **Whitespace Tokenizer Breakdown:**
   Languages like Japanese do not employ spaces between words (`この映画は...`). Whitespace tokenization treats the entire sentence as a single word, breaking any lexical matching.

5. **Lack of True Model Explainability:**
   Hardcoded lexicons cannot explain contextual negation (e.g., "not bad at all" is flagged as containing the negative keyword "bad"). Genuine model explainability requires perturbation methods like occlusion sensitivity.

6. **Monolithic Streamlit Coupling:**
   The UI, state management, and inference are tied to Streamlit. Streamlit lacks the component granularity, full keyboard shortcut support (e.g., Cmd+K), headless API decoupling, and low-latency rendering expected of modern SaaS products.

7. **No Language Detection or Routing:**
   The system assumes all input is English and makes no attempt to identify the source language, verify character encoding, or handle multilingual script fallbacks.

---

## 5. Architectural Upgrade Path for GlobalSense AI

To transform this foundation into **GlobalSense AI**, we implement the following direct extensions:

1. **Standardized 3-Class Formulation:** Shift from binary sigmoid to 3-class softmax (`[Negative, Neutral, Positive]`), maintaining identical label indexing across all pipelines.
2. **Dual Baseline Benchmarking:** 
   - Baseline A: Word TF-IDF + Logistic Regression (reusing classical NLP workflow).
   - Baseline B: Word + Character n-gram TF-IDF + Logistic Regression (preserving negation and non-Latin unicode code points).
3. **Subword-Aware Deep Learning:** PyTorch BiLSTM with SentencePiece / subword embedding layers capable of multi-script representation.
4. **State-of-the-Art Transformer:** Fine-tuned `xlm-roberta-base` (with comparison against `mdeberta-v3-base`) for zero-shot and fine-tuned cross-lingual transfer.
5. **Multi-Stage Language Detection:** `lingua-language-detector` backed by Unicode script analysis and a dedicated Hinglish transliteration heuristic.
6. **Occlusion-Based Attribution:** True input-perturbation explainability that computes the exact shift in class probability upon word removal.
7. **Full-Stack Decoupling:** FastAPI asynchronous REST backend paired with a high-performance React + TypeScript + Vite + Tailwind CSS + Framer Motion interface.
