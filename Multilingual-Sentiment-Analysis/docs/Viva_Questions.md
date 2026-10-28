# BCA NLP Project Viva Defense: Comprehensive Q&A Guide

**Project:** GlobalSense AI – Multilingual Sentiment Intelligence Platform  
**Target:** BCA 5th Semester External Examiner Defense  
**Tone:** Confident, technically precise, beginner-friendly yet theoretically rigorous.  

---

### Q1. Why did you choose 3 classes (Positive, Negative, Neutral) instead of standard binary classification (Positive / Negative)?
**Answer:**
> Real-world sentiment in user feedback, customer reviews, and social media is rarely binary. Binary classification forces factual statements, neutral inquiries, mixed reviews, or objective news into artificial positive or negative polarities, causing high error rates and deceptive metrics. 
> 
> In **GlobalSense AI**, we enforce a strict 3-class schema (`Positive`, `Negative`, `Neutral`) with fixed label ordering across all datasets and models. For instance, in customer support or product reviews, a statement like *"Ordered on Tuesday, package arrived today"* is purely Neutral. Forcing that to Positive or Negative degrades downstream business intelligence.

---

### Q2. Which model is currently active in your live deployment, and what are its empirical results?
**Answer:**
> Our active production model is the **Pretrained Cross-Lingual XLM-RoBERTa** checkpoint (`cardiffnlp/twitter-xlm-roberta-base-sentiment`).
> 
> Rather than assuming label order, our backend dynamically parses `model.config.id2label` to map model indices directly to our canonical classes: `[Positive, Negative, Neutral]`.
> 
> Evaluated zero-shot on our held-out test set of 2,952 unseen samples across 10 languages:
> - **Test Accuracy:** **63.25%** (1,867 / 2,952 correct)
> - **Macro-F1 Score:** **0.6096**
> - **Selective Accuracy ($\tau \ge 0.60$):** **71.23%** (1,300 / 1,825 correct)
> - **Expected Calibration Error ($ECE$):** **0.0838** (8.38%)
> - **CPU Inference Latency:** **157.16 ms / sample**
> 
> It is clearly labeled in the UI as *"Pretrained Multilingual Checkpoint (CardiffNLP - Not Trained by this Project)"* to maintain absolute academic honesty.

---

### Q3. What is Selective Classification (Uncertainty Rejection) and why did you implement it?
**Answer:**
> In safety-critical applications, giving an incorrect prediction with high confidence is far worse than acknowledging uncertainty. 
> 
> We implemented a selective classification policy with an uncertainty threshold of $\tau = 0.60$:
> - If $\max_{c \in C} P(y=c \mid x) < 0.60$, the system flags the result with an amber **"Uncertain"** badge and an explanatory banner, while still displaying the underlying probability distribution.
> - On our held-out test set of 2,952 samples, 1,127 samples (38.18%) fell below this threshold.
> - On the remaining 1,825 confident samples, model accuracy jumped from **63.25% to 71.23%** (+7.98% reliability gain).

---

### Q4. Why did Baseline B (Word + Char n-grams) significantly outperform Baseline A (Word TF-IDF)?
**Answer:**
> Across our 10 target languages, **Baseline B** achieved a Macro-F1 of **0.6245** (Accuracy 62.60%), outperforming **Baseline A**'s Macro-F1 of **0.5864** (+3.8% absolute gain).
>
> The reason lies in linguistic topology:
> 1. **Script without whitespace segmentation:** Languages like Japanese (`ja`) do not separate words with spaces. Standard word tokenizers treat entire Japanese clauses as single unsegmented strings, resulting in total out-of-vocabulary (OOV) failure. Character n-grams (2 to 5 characters) naturally slice Japanese kana and kanji into meaningful subwords.
> 2. **Code-Mixed Hinglish (`hi-Latn`):** Hinglish users do not follow standard spelling (e.g., "very" can be written as *bohot*, *bahut*, *bhut*, or *bhot*). Word tokenizers treat these as 4 distinct words. Character n-grams capture common morphological substrings like `boh`, `hut`, `ahu`, preserving semantic affinity.
> 3. **Morphologically rich inflection:** In languages like Hindi, Spanish, and Arabic, character n-grams capture grammatical roots and sentiment prefixes/suffixes without requiring separate lemmatizers for each language.

---

### Q5. How does your Language Detection engine distinguish Hindi written in Latin script (Hinglish) from other Latin-script languages?
**Answer:**
> We designed a multi-tier detection architecture in `backend/src/language_detection.py`:
> 1. **Script Check:** First, we inspect Unicode character blocks. If Devanagari script is present, it is immediately routed to Hindi (`hi`). If Arabic script is present, it is routed to Arabic (`ar`).
> 2. **European Accent Disqualification:** If the text contains characteristic Latin diacritics (`é, è, ê, à, â, ç, ñ, ó, í, ú, ü, ä, ö, ß, œ`), it is immediately disqualified from Hinglish to prevent false positives on French, Spanish, or German.
> 3. **Lexical Density Scoring:** We tokenize the Latin string and match tokens against a curated lexicon of 150+ high-frequency Hindi functional and grammatical words (e.g., *hai*, *nahi*, *kyun*, *bhai*, *bohot*, *accha*, *karo*, *wala*). If the ratio exceeds our threshold, it is labeled Hinglish (`hi-Latn`).
> 4. **Statistical Fallback:** If not Hinglish, `lingua-language-detector` handles statistical n-gram detection over the restricted 10 target languages.

---

### Q6. Why did you use Occlusion Sensitivity instead of showing Attention Weights for Explainability?
**Answer:**
> As established by Jain & Wallace (2019) in their landmark ACL paper *"Attention is Not Explanation"*, raw self-attention weights do not reflect true causal feature importance. Attention is simply an intermediate routing mechanism; one can find counterfactual attention distributions that yield the exact same prediction.
>
> In contrast, **Occlusion Sensitivity** (pioneered by Zeiler & Fergus, 2014) is a faithful, model-agnostic perturbation technique:
> $$\Delta P(y \mid w_i) = P(y \mid x) - P(y \mid x \setminus \{w_i\})$$
> We omit each word $w_i$ from the sentence and measure how much the probability of the predicted class changes. If removing a word causes the model's confidence to drop sharply ($\Delta P > 0$), that word is causally responsible for supporting the prediction. This gives users honest, verifiable explanations rather than cosmetic heatmaps.

---

### Q7. What is Expected Calibration Error (ECE) and why is it important in your Analytics dashboard?
**Answer:**
> Expected Calibration Error (ECE), formulated by Guo et al. (2017), measures whether a model's predicted confidence matches its true historical accuracy.
>
> If a model predicts 100 sentences with 80% confidence, exactly 80 of them should be correct. If only 50 are correct, the model is overconfident and miscalibrated. 
> ECE partitions predictions into $M=10$ bins and computes the weighted average gap between confidence and accuracy:
> $$\text{ECE} = \sum_{m=1}^{M} \frac{|B_m|}{N} \left| \text{acc}(B_m) - \text{conf}(B_m) \right|$$
> Our active XLM-RoBERTa achieves an honest ECE of **0.0838** (8.38%), which we visualize in a 10-bin reliability table in the Analytics dashboard.

---

### Q8. How did you ensure ZERO Data Leakage between Train, Validation, and Test sets?
**Answer:**
> Data leakage produces artificially inflated test scores that collapse in production. We prevented leakage using a rigorous 4-step pipeline:
> 1. **Deduplication:** We loaded 22,949 raw candidate samples and removed duplicate texts using exact string and normalized hashing, yielding 19,679 unique records.
> 2. **Fixed Random Seed:** Split with `random_state=42` using `StratifiedShuffleSplit`.
> 3. **Joint Stratification:** We stratified across the Cartesian product of `Language` $\times$ `Sentiment Label` ($10 \times 3 = 30$ strata). This guaranteed balanced class and language distributions across train (75%), validation (10%), and test (15%).
> 4. **No Fit on Test:** Feature extractors (TF-IDF vectorizers and BiLSTM vocabularies) were fitted **only** on the training set, never on validation or test sets.

---

### Q9. What minimum test set threshold did you enforce for marking a language "Supported"?
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

### Q10. What is the real VRAM requirement for fine-tuning XLM-RoBERTa, and how did you verify it?
**Answer:**
> There is a common myth that fine-tuning multilingual transformers requires enterprise clusters with $\ge 16\text{ GB}$ VRAM. **This is false.**
> 
> The exact memory breakdown for `xlm-roberta-base` (278M parameters) with batch size 16 and sequence length 128:
> - Model weights in FP16: $\approx 0.55\text{ GB}$
> - AdamW optimizer states: $\approx 3.33\text{ GB}$
> - Gradients in FP16: $\approx 0.55\text{ GB}$
> - Activations in FP16: $\approx 2.20\text{ GB}$
> - **Total Peak VRAM:** **~6.63 to 6.8 GB**
> 
> A standard free Google Colab or Kaggle T4 GPU provides **15.36 GB GDDR6 VRAM**. Therefore, fine-tuning uses under 45% of a free T4 GPU. We prepared `notebooks/train_xlmr_colab.ipynb` configured with `fp16=True`, which runs all 3 epochs in ~28 minutes on Colab free tier with zero OOM risk.

---

### Q11. How did you verify Demo Safety before presenting?
**Answer:**
> To guarantee that our model does not fail on obvious cases in a live demonstration:
> 1. We built a standardized validation sheet `tests/demo_sentences.csv` containing 30 balanced sentences (3 per language across all 10 languages).
> 2. We included the critical edge case that caused a failure in earlier baselines: *"This is the worst purchase I have ever made. The product broke on the first day and customer service was useless."* (Baseline B misclassified this as Positive 50.6%).
> 3. We executed automated pytest validation (`tests/test_demo_safety.py`).
> 4. **Result:** The active XLM-RoBERTa model passed **29 out of 30 sentences (96.7% pass rate)**, and correctly predicted the critical negative review as **Negative with 95.15% confidence**.

---

### Q12. What is the biggest error mode in your system, and how do you explain it?
**Answer:**
> As documented in `docs/Error_Analysis.md`, the primary failure mode is **Neutral Class Boundary Collapse**:
> - While Positive ($F_1 = 0.7095$) and Negative ($F_1 = 0.6939$) are robust, Neutral achieves only **$F_1 = 0.4253$** with a recall of 33.30% (313/940).
> - In an audit of 50 test set disagreements, 38 out of 50 (76%) involved the Neutral class.
> - **Root Cause:** In real-world e-commerce datasets (e.g. MultiLingualSentiment), 3-star reviews are labeled "Neutral", but customers write 3-star reviews to describe specific defects (e.g., *"battery drains fast"*, *"delivery was delayed"*). The model picks up genuine negative sentiment and predicts Negative, causing formal disagreement with noisy dataset labels.
> - **Mitigation:** Our $\tau = 0.60$ uncertainty filter flags these ambiguous cases as **"Uncertain"**, successfully boosting selective accuracy to 71.23%.

---

### Q13. Why not translate all incoming foreign text to English first and just use a strong English classifier?
**Answer:**
> We thoroughly investigated this architectural alternative and empirically benchmarked it (see `translation_experiment.json` and the Analytics "Translate-Test Study" tab). We chose **direct multilingual classification as our default production strategy** for three major reasons:
> 1. **Latency Overhead:** Translating text requires a separate neural sequence-to-sequence model (Helsinki-NLP `opus-mt`), which introduces 150–400ms additional latency per sentence on CPU.
> 2. **Cascading Error Propagation:** Machine translation is not loss-free. Colloquial idioms, sarcasm, litotes, and cultural nuance frequently get mangled or stripped during translation. If the translator produces an inaccurate English rendering, the downstream classifier has no way to recover the original sentiment.
> 3. **Empirical Evidence:** In our controlled translate-test study ($N=50$ samples per language across 8 translatable languages, seed 42), the F1 differences between direct XLM-R and the translate-first pipeline fall well within standard statistical noise margins. Adding an extra neural translation model adds computational cost and pipeline failure points without a statistically significant accuracy dividend.

---

### Q14. Why is translation unavailable for Hinglish (Romanized Hindi)?
**Answer:**
> Hinglish (`hi-Latn`) is an informal, code-mixed language written in Latin script (e.g., *"ye product bilkul bekar hai, time waste mat karo"*).
> 1. **No Standard Lexicon or Grammar:** Hinglish has non-standard phonetic spellings (*bohot / bahut / bhut*, *acchi / achhi / aachi*), syntactic borrowing, and intra-sentential language switches between English and Hindi.
> 2. **MT Failure:** Standard machine translation models (including Helsinki-NLP `opus-mt-hi-en`) are trained exclusively on formal Devanagari script. Feeding Romanized Hindi into a Devanagari translation model produces total gibberish or outright failure.
> 3. **Why Direct XLM-R Succeeds:** XLM-RoBERTa is pretrained across massive multilingual Common Crawl dumps that contain real-world Romanized and code-mixed informal text. Its SentencePiece subword tokenization naturally segments and encodes Hinglish morphemes, allowing it to predict sentiment directly without an intermediate translation bridge.

