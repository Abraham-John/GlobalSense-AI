# BCA NLP Project Viva Defense: Comprehensive Q&A Guide

**Project:** GlobalSense AI – Production Multilingual Sentiment Analysis Platform  
**Target:** BCA 5th Semester External Examiner Defense  
**Tone:** Confident, technically precise, beginner-friendly yet theoretically rigorous.

---

### Q1. Why did you choose 3 classes (Positive, Negative, Neutral) instead of standard binary classification (Positive / Negative)?
**Answer:**
> Real-world sentiment in user feedback, customer reviews, and social media is rarely binary. Binary classification forces factual statements, neutral inquiries, mixed reviews, or objective news into artificial positive or negative polarities, causing high error rates and deceptive metrics. 
> 
> In **GlobalSense AI**, we enforce a strict 3-class schema (`Positive`, `Negative`, `Neutral`) with fixed label ordering across all datasets and models. For instance, in customer support or product reviews, a statement like *"Ordered on Tuesday, package arrived today"* is purely Neutral. Forcing that to Positive or Negative degrades downstream business intelligence.

---

### Q2. Why did Baseline B (Word + Char n-grams) significantly outperform Baseline A (Word TF-IDF)?
**Answer:**
> Across our 10 target languages, **Baseline B** achieved a Macro-F1 of **0.6245** (Accuracy 62.60%), outperforming **Baseline A**'s Macro-F1 of **0.5864** (+3.8% absolute gain).
>
> The reason lies in linguistic topology:
> 1. **Script without whitespace segmentation:** Languages like Japanese (`ja`) do not separate words with spaces. Standard word tokenizers treat entire Japanese clauses as single unsegmented strings, resulting in total out-of-vocabulary (OOV) failure. Character n-grams (2 to 5 characters) naturally slice Japanese kana and kanji into meaningful subwords.
> 2. **Code-Mixed Hinglish (`hi-Latn`):** Hinglish users do not follow standard spelling (e.g., "very" can be written as *bohot*, *bahut*, *bhut*, or *bhot*). Word tokenizers treat these as 4 distinct words. Character n-grams capture common morphological substrings like `boh`, `hut`, `ahu`, preserving semantic affinity.
> 3. **Morphologically rich inflection:** In languages like Hindi, Spanish, and Arabic, character n-grams capture grammatical roots and sentiment prefixes/suffixes without requiring separate lemmatizers for each language.

---

### Q3. How does your Language Detection engine distinguish Hindi written in Latin script (Hinglish) from other Latin-script languages?
**Answer:**
> We designed a multi-tier detection architecture in `backend/src/language_detection.py`:
> 1. **Script Check:** First, we inspect Unicode character blocks. If Devanagari script is present, it is immediately routed to Hindi (`hi`). If Arabic script is present, it is routed to Arabic (`ar`).
> 2. **European Accent Disqualification:** If the text contains characteristic Latin diacritics (`é, è, ê, à, â, ç, ñ, ó, í, ú, ü, ä, ö, ß, œ`), it is immediately disqualified from Hinglish to prevent false positives on French, Spanish, or German.
> 3. **Lexical Density Scoring:** We tokenize the Latin string and match tokens against a curated lexicon of 150+ high-frequency Hindi functional and grammatical words (e.g., *hai*, *nahi*, *kyun*, *bhai*, *bohot*, *accha*, *karo*, *wala*). If the ratio exceeds our threshold, it is labeled Hinglish (`hi-Latn`).
> 4. **Statistical Fallback:** If not Hinglish, `lingua-language-detector` handles statistical n-gram detection over the restricted 10 target languages.

---

### Q4. Why did you use Occlusion Sensitivity instead of showing Attention Weights for Explainability?
**Answer:**
> As established by Jain & Wallace (2019) in their landmark ACL paper *"Attention is Not Explanation"*, raw self-attention weights do not reflect true causal feature importance. Attention is simply an intermediate routing mechanism; one can find counterfactual attention distributions that yield the exact same prediction.
>
> In contrast, **Occlusion Sensitivity** (pioneered by Zeiler & Fergus, 2014) is a faithful, model-agnostic perturbation technique:
> $$\Delta P(y \mid w_i) = P(y \mid x) - P(y \mid x \setminus \{w_i\})$$
> We omit each word $w_i$ from the sentence and measure how much the probability of the predicted class changes. If removing a word causes the model's confidence to drop sharply ($\Delta P > 0$), that word is causally responsible for supporting the prediction. This gives users honest, verifiable explanations rather than cosmetic heatmaps.

---

### Q5. What is Expected Calibration Error (ECE) and why is it important in your Analytics dashboard?
**Answer:**
> Expected Calibration Error (ECE), formulated by Guo et al. (2017), measures whether a model's predicted confidence matches its true historical accuracy.
>
> If a model predicts 100 sentences with 80% confidence, exactly 80 of them should be correct. If only 50 are correct, the model is overconfident and miscalibrated. 
> ECE partitions predictions into $M=10$ bins and computes the weighted average gap between confidence and accuracy:
> $$\text{ECE} = \sum_{m=1}^{M} \frac{|B_m|}{N} \left| \text{acc}(B_m) - \text{conf}(B_m) \right|$$
> Our Baseline B achieves an honest ECE of **0.0886** (8.86%), which we visualize in a 10-bin reliability table in the Analytics dashboard.

---

### Q6. How did you ensure ZERO Data Leakage between Train, Validation, and Test sets?
**Answer:**
> Data leakage produces artificially inflated test scores that collapse in production. We prevented leakage using a rigorous 4-step pipeline:
> 1. **Deduplication:** We loaded 22,949 raw candidate samples and removed duplicate texts using exact string and normalized hashing, yielding 19,679 unique records.
> 2. **Fixed Random Seed:** Split with `random_state=42` using `StratifiedShuffleSplit`.
> 3. **Joint Stratification:** We stratified across the Cartesian product of `Language` $\times$ `Sentiment Label` ($10 \times 3 = 30$ strata). This guaranteed balanced class and language distributions across train (75%), validation (10%), and test (15%).
> 4. **No Fit on Test:** Feature extractors (TF-IDF vectorizers and BiLSTM vocabularies) were fitted **only** on the training set, never on validation or test sets.

---

### Q7. What minimum test set threshold did you enforce for marking a language "Supported"?
**Answer:**
> We established a strict empirical threshold: a language is marked **"Supported"** in the UI and documentation only if:
> 1. It is present in the training corpus.
> 2. The held-out test set contains **at least 200 independently verified samples**.
>
> In our test corpus (`backend/dataset/processed/test.csv`, total 2,952 samples):
> - English (`en`): 270 samples
> - Hindi (`hi`): 315 samples
> - Hinglish (`hi-Latn`): 477 samples
> - French (`fr`): 270 samples
> - Spanish (`es`): 270 samples
> - German (`de`): 270 samples
> - Italian (`it`): 270 samples
> - Portuguese (`pt`): 270 samples
> - Arabic (`ar`): 270 samples
> - Japanese (`ja`): 270 samples
>
> Every single language satisfies $\ge 200$ test samples, mathematically justifying the "Supported" badge across all 10 languages.

---

### Q8. Why did you provide both a local training script and a Google Colab notebook for XLM-RoBERTa?
**Answer:**
> XLM-RoBERTa base has approximately 278 million parameters. Full fine-tuning on a 15,000-sample multilingual corpus requires a modern GPU (like NVIDIA T4 or A100 with at least 15 GB VRAM) and 16-bit mixed precision (`fp16`).
>
> On my Windows laptop with an Intel CPU and no dedicated CUDA GPU:
> - Training XLM-R locally for 3 epochs would take over 18 hours and risk system freeze.
> - Therefore, following professional MLOps best practices:
>   1. We created `backend/src/train_xlmr.py` with a `--tiny_sample` verification mode, which we executed end-to-end to verify that the PyTorch forward, backward, optimizer, and export pipeline operates without bugs.
>   2. We created a ready-to-run Google Colab / Kaggle T4 notebook (`notebooks/train_xlmr_colab.ipynb`) that downloads the exact preprocessed dataset, fine-tunes XLM-R with mixed precision and early stopping, and exports the final model and metrics.
>   3. In production on CPU, we load our fine-tuned weights or fallback to `cardiffnlp/twitter-xlm-roberta-base-sentiment` with explicit UI labeling.

---

### Q9. Walk me through the inference latency of your models on CPU.
**Answer:**
> Through our automated benchmark on the 2,952 test samples (`results/outputs/model_comparison.json`):
> - **Baseline A (Word TF-IDF + Logistic Regression):** **0.037 ms / sample** (27,000 req/sec)
> - **Baseline B (Word + Char n-gram + Logistic Regression):** **0.499 ms / sample** (2,000 req/sec)
> - **BiLSTM (PyTorch CPU):** **2.894 ms / sample** (345 req/sec)
> - **XLM-RoBERTa (Transformer on CPU):** ~**45 to 80 ms / sample**
>
> Baseline B offers an exceptional sweet spot for edge and low-cost deployment: it delivers 62.6% accuracy and 0.6245 F1 across 10 diverse languages in under 0.5 milliseconds per request without requiring expensive GPU infrastructure.

---

### Q10. What preprocessing steps were applied to normalize multilingual scripts?
**Answer:**
> Handled in `backend/src/preprocessing.py`:
> 1. **Unicode NFC Normalization:** We apply `unicodedata.normalize('NFC', text)` to combine decomposed accents and ligatures into canonical composite characters, ensuring identical representations across OS keyboards.
> 2. **Devanagari Nukta & Halant preservation:** Unlike English-centric pipelines that blindly strip punctuation and non-ASCII characters, we preserve Devanagari modifiers, danda (`।`), and virama (`्`) which alter word semantics.
> 3. **Negation preservation:** Words like *not*, *never*, *nahi*, *mat*, *pas*, *ne*, *nicht* are explicitly preserved.
> 4. **URL & Handle Sanitization:** HTTP links and `@username` mentions are scrubbed to eliminate irrelevant noise.
