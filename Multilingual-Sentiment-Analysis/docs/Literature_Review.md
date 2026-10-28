# Literature Review & Theoretical Foundations

**Project:** GlobalSense AI – Multilingual Sentiment Analysis Platform  
**Academic Context:** BCA 5th Semester NLP Capstone Project  
**Author:** Candidate for Bachelor of Computer Applications  
**Date:** October 2026  

---

## 1. Executive Summary

Sentiment analysis has evolved rapidly from lexicon-based systems and bag-of-words classifiers to subword transformer architectures. However, expanding sentiment analysis from monolingual English corpora to diverse multilingual, non-Latin script, and code-mixed settings presents distinct linguistic and computational challenges:
1. Tokenization brittleness across non-segmenting languages (e.g., Japanese script).
2. High vocabulary fragmentation in Romanized code-mixed text (e.g., Hinglish / Hindi-in-Latin-script).
3. Faithfulness and interpretability of model predictions.
4. Model calibration (ensuring predicted confidence aligns with true empirical accuracy).

This literature review critically synthesizes six foundational peer-reviewed publications that directly underpin the architecture, methodology, baseline selection, and explainability framework of **GlobalSense AI**.

---

## 2. Synthesized Literature Matrix

| Reference | Core Contribution | Relevance to GlobalSense AI | Architectural Impact |
|:---|:---|:---|:---|
| **Conneau et al. (2020)** | XLM-RoBERTa (Cross-lingual Language Model) trained on 2.5TB CommonCrawl across 100 languages. | Demonstrates superior cross-lingual transfer without requiring bilingual parallel corpora. | Adopted as the flagship Transformer architecture (`xlm-roberta-base`) for fine-tuning. |
| **Patwa et al. (2020)** | SemEval-2020 Task 9 (SentiMix): Sentiment Analysis for Code-Mixed Social Media Text (Hindi-English). | Establishes benchmarks, phonetic spelling variations, and difficulties of code-mixed Hinglish. | Informs our Roman-script Hinglish heuristic, 3-class distribution, and tokenization approach. |
| **Devlin et al. (2019)** | BERT: Pre-training Deep Bidirectional Transformers for Language Understanding. | Introduces bidirectional self-attention representation, revolutionizing NLP classification. | Sets the contextual embedding paradigm underpinning all modern masked language models. |
| **Zeiler & Fergus (2014)** | Visualizing and Understanding Convolutional Networks (Input Occlusion Sensitivity). | Establishes systematic feature occlusion ($\Delta P$) to quantify true feature importance. | Adapted to NLP as the faithful word-level occlusion importance engine ($\Delta P = P(y \mid x) - P(y \mid x \setminus \{w_i\})$). |
| **Guo et al. (2017)** | On Calibration of Modern Neural Networks (Expected Calibration Error - ECE). | Proves modern deep models are often overconfident; provides formal ECE formulation and reliability diagrams. | Direct implementation of 10-bin Expected Calibration Error ($ECE = 0.0886$) in our evaluation suite. |
| **Jain & Wallace (2019)** | Attention is Not Explanation. | Demonstrates raw self-attention weights correlate weakly with output changes and produce deceptive highlights. | Justifies our conscious architectural rejection of fake attention maps in favor of input perturbation. |

---

## 3. In-Depth Paper Reviews

### 3.1. Cross-Lingual Representation: Conneau et al. (2020)
* **Citation:** Conneau, A., Khandelwal, K., Goyal, N., Chaudhary, V., Wenzek, G., Guzmán, F., Grave, E., Ott, M., Zettlemoyer, L., & Stoyanov, V. (2020). *Unsupervised Cross-lingual Representation Learning at Scale*. In Proceedings of the 58th Annual Meeting of the Association for Computational Linguistics (ACL 2020), pp. 8440–8451.
* **Problem Addressed:** Prior cross-lingual representations (e.g., mBERT) were constrained by limited Wikipedia data for low-resource languages and smaller vocabulary budgets.
* **Methodology:** Pretrained on a 2.5TB filtered CommonCrawl dataset across 100 languages using a 250,000 token SentencePiece vocabulary without bilingual supervision.
* **Findings:** Outperforms mBERT by over 5% average accuracy across cross-lingual classification benchmarks (XNLI), particularly excelling on non-Latin scripts (Devanagari, Arabic, Japanese) due to its shared subword vocabulary.
* **Application to Project:** XLM-RoBERTa was selected as our flagship architecture (`xlm-roberta-base`). Because local hardware constraints (CPU-only Windows laptop) prevent full multi-epoch fine-tuning locally, we provide a complete, reproducible Google Colab / Kaggle T4 GPU notebook (`notebooks/train_xlmr_colab.ipynb`) and local CLI script (`backend/src/train_xlmr.py`).

---

### 3.2. Code-Mixed NLP: Patwa et al. (2020)
* **Citation:** Patwa, P., Aguilar, G., Kar, P., Pandey, S., PYKL, S., Gambäck, B., Chakraborty, T., Solorio, T., & Das, A. (2020). *SemEval-2020 Task 9: Overview of Sentiment Analysis of Code-Mixed Social Media Text (SentiMix Hindi-English and Spanish-English)*. In Proceedings of the 14th International Workshop on Semantic Evaluation, pp. 1000–1012.
* **Problem Addressed:** Social media users in multilingual societies (e.g., India) frequently mix vocabulary and grammatical structures from two languages (e.g., Hindi written in Latin script with English loanwords), creating severe out-of-vocabulary (OOV) challenges.
* **Methodology:** Created standardized 3-class (Positive, Negative, Neutral) sentiment benchmarks for Hindi-English code-mixed tweets. Evaluated traditional ML baselines against deep architectures.
* **Findings:** Character-level features, subword representations, and multilingual embeddings significantly outperform standard whitespace word tokenizers. Word-level models fail due to creative non-standard phonetic spellings (e.g., *bohot*, *bahut*, *bhut* for "very").
* **Application to Project:** Directly validated our **Baseline B** design (Word (1-2) + Character (2-5) n-grams), which lifted Hinglish Macro-F1 from 0.5864 (Baseline A) to 0.6245 (+3.8%). We curated 3,190 legitimate Hinglish comments and integrated a multi-tier script + lexicon detection engine.

---

### 3.3. Transformer Foundations: Devlin et al. (2019)
* **Citation:** Devlin, J., Chang, M.-W., Lee, K., & Toutanova, K. (2019). *BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding*. In Proceedings of NAACL-HLT 2019, pp. 4171–4186.
* **Problem Addressed:** Previous language models (Word2Vec, GloVe, standard LSTMs) were context-free or unidirectional, failing to capture subtle bidirectional linguistic context.
* **Methodology:** Masked Language Modeling (MLM) and Next Sentence Prediction (NSP) over multi-layer bidirectional Transformer encoders.
* **Findings:** Bidirectional self-attention provides superior context representations for sentence-level semantic classification tasks.
* **Application to Project:** Provides the fundamental architectural baseline for modern contextual representations used in our deep model comparison hierarchy (Baseline A $\to$ Baseline B $\to$ BiLSTM $\to$ XLM-R).

---

### 3.4. Faithful Explainability: Zeiler & Fergus (2014)
* **Citation:** Zeiler, M. D., & Fergus, R. (2014). *Visualizing and Understanding Convolutional Networks*. In European Conference on Computer Vision (ECCV 2014), pp. 818–833.
* **Problem Addressed:** Complex neural networks function as opaque black boxes; determining which input features drive predictions is non-trivial.
* **Methodology:** Occlusion sensitivity analysis: systematic masking of localized input regions while recording the quantitative degradation in output prediction confidence.
* **Findings:** Perturbing decisive features causes precipitous probability drops, proving direct causal attribution.
* **Application to Project:** We ported Zeiler & Fergus's causal occlusion principle directly into text classification:
  $$\Delta P(y \mid w_i) = P(y \mid x) - P(y \mid x \setminus \{w_i\})$$
  Every token in the input string is systematically omitted, and the model re-evaluates the sentence in real time. If omitting $w_i$ causes the predicted class probability to drop significantly, $w_i$ is highlighted as supporting that sentiment.

---

### 3.5. Model Calibration & Reliability: Guo et al. (2017)
* **Citation:** Guo, C., Pleiss, G., Sun, Y., & Weinberger, K. Q. (2017). *On Calibration of Modern Neural Networks*. In Proceedings of the 34th International Conference on Machine Learning (ICML 2017), PMLR 70:1321–1330.
* **Problem Addressed:** Modern deep neural networks with high accuracy are systematically miscalibrated: their softmax probabilities tend to severely overestimate true likelihood of correctness.
* **Methodology:** Defined Expected Calibration Error (ECE) across $M$ confidence bins:
  $$\text{ECE} = \sum_{m=1}^{M} \frac{|B_m|}{N} \left| \text{acc}(B_m) - \text{conf}(B_m) \right|$$
* **Findings:** Depth, width, and weight decay influence calibration; post-processing techniques (such as temperature scaling) or explicit calibration tracking are essential for trustworthy AI.
* **Application to Project:** GlobalSense AI computes real 10-bin ECE ($0.0886$ on Baseline B) and provides reliability tables in the Analytics dashboard. The UI explicitly labels softmax values as *"Model Confidence"* rather than *"Probability of Being Correct"*, adhering directly to Guo et al.'s findings.

---

### 3.6. Critiquing Attention Maps: Jain & Wallace (2019)
* **Citation:** Jain, S., & Wallace, B. C. (2019). *Attention is Not Explanation*. In Proceedings of the 2019 Conference of the North American Chapter of the Association for Computational Linguistics (NAACL 2019), pp. 3543–3556.
* **Problem Addressed:** NLP practitioners frequently visualize self-attention weights (e.g., heatmaps) and present them to users as feature importance explanations.
* **Methodology:** Extensive empirical tests showing that learned attention weights do not correspond to feature importance: counterfactual attention distributions can be found that produce identical predictions, and attention weights correlate poorly with gradient-based or erasure-based feature importance.
* **Findings:** Self-attention is a routing mechanism, not a faithful explanation of model decisions.
* **Application to Project:** Jain & Wallace's findings guided our core architectural decision: **never display fake attention maps or ungrounded highlights**. GlobalSense AI relies exclusively on genuine, counterfactual input occlusion sensitivity.

---

## 4. Synthesis and Research Gaps Addressed

Traditional student projects often rely on monolingual English datasets (e.g., IMDb or Sentiment140) evaluated solely with accuracy. By synthesizing this literature:
1. **Multilingual Rigor:** We address tokenization barriers by validating character n-grams across Latin, Devanagari, Arabic, and Japanese scripts.
2. **Code-Mixed Treatment:** We give first-class standing to Hinglish through dedicated dataset sourcing, script detection, and subword modeling.
3. **Honest Explainability:** We reject cosmetic attention heatmaps in favor of causal input occlusion.
4. **Statistical Honesty:** We incorporate Expected Calibration Error (ECE) alongside Macro-F1 across an un-leaked held-out test set exceeding 200 samples per supported language.
