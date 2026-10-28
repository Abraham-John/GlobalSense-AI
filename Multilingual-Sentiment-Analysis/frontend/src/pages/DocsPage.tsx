import React, { useState } from 'react';
import {
  BookOpen,
  HelpCircle,
  FileCode,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
} from 'lucide-react';

export const DocsPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const vivaFaqs = [
    {
      q: 'Why shift from binary sentiment to 3-class sentiment (GlobalSense AI)?',
      a: 'Real-world customer reviews, social media discourse, and multilingual feedback frequently express neutral, balanced, or purely factual statements. A binary sigmoid forces an arbitrary decision on objective text (e.g., "The store opens at 9 AM"), resulting in extreme false positives or negatives. 3-class softmax accurately isolates neutral text.',
    },
    {
      q: 'Why does Baseline B (Word + Char n-gram) outperform Baseline A (Word TF-IDF)?',
      a: 'Classical word tokenizers break on morphologically rich languages (Hindi, Arabic, German compound words) and code-mixed scripts (Hinglish) where phonetic spelling varies. Character n-grams (2-5 chars) capture inflectional prefixes, suffixes, and transliterated word roots even when novel words appear.',
    },
    {
      q: 'Why is Hinglish (Roman-script Hindi) particularly difficult for standard NLP models?',
      a: 'Hinglish lacks standardized orthography. The same word can be spelled "achha", "accha", "achhaa", or "acha". Standard English vocabularies classify these as out-of-vocabulary (OOV). Our pipeline solves this using a dedicated Hinglish grammatical marker heuristic and character n-gram/subword embeddings.',
    },
    {
      q: 'How does occlusion-based explainability differ from attention maps?',
      a: 'Attention weights show internal self-attention matrix activations, which empirical studies (Jain & Wallace 2019) have shown do not reliably correlate with token feature importance. Occlusion sensitivity is a causal perturbation method: it directly measures the change in model output probability when a word is removed, providing honest feature attribution.',
    },
    {
      q: 'Why provide a Colab training notebook for XLM-RoBERTa while running CPU inference locally?',
      a: 'Transformer fine-tuning requires CUDA GPU acceleration (e.g. Google Colab / Kaggle T4 16GB GPU with fp16 mixed precision) for backward pass optimizer gradients. Local standard CPU is ideal for forward pass inference, while cloud GPU resources provide fast, reproducible training without local thermal throttling.',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12 py-4">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-4xl font-display font-bold text-white tracking-tight">
          System Documentation & Viva Defense Guide
        </h1>
        <p className="text-sm sm:text-base text-slate-400 font-sans leading-relaxed">
          Comprehensive academic and technical reference guide for evaluation committees, viva defense, and system maintainers.
        </p>
      </div>

      {/* Tech Stack Matrix */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-brand-cyan" />
          Technical Stack Specifications
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-surface-elevated border border-surface-border space-y-3">
            <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-cyan" />
              Frontend Presentation Tier
            </h3>
            <ul className="space-y-1.5 text-xs font-mono text-slate-300">
              <li><strong className="text-white">Framework:</strong> React 18 + TypeScript + Vite 5</li>
              <li><strong className="text-white">Styling:</strong> Tailwind CSS + Design Tokens (WCAG AA)</li>
              <li><strong className="text-white">Motion:</strong> Framer Motion (respects prefers-reduced-motion)</li>
              <li><strong className="text-white">Charts:</strong> Recharts SVG Reactive Engine</li>
              <li><strong className="text-white">Typography:</strong> Geist, JetBrains Mono, Noto Sans Devanagari/Arabic/JP</li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-surface-elevated border border-surface-border space-y-3">
            <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-indigo" />
              Backend Intelligence Tier
            </h3>
            <ul className="space-y-1.5 text-xs font-mono text-slate-300">
              <li><strong className="text-white">Runtime:</strong> Python 3.10+ / 3.14 + FastAPI + Uvicorn</li>
              <li><strong className="text-white">Validation:</strong> Pydantic V2 Contract Schemas</li>
              <li><strong className="text-white">Classical ML:</strong> scikit-learn (FeatureUnion TF-IDF + Logistic Regression)</li>
              <li><strong className="text-white">Deep Learning:</strong> PyTorch 2.x (2-Layer Subword BiLSTM)</li>
              <li><strong className="text-white">Language ID:</strong> lingua-language-detector + Unicode Script Heuristic</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Viva Defense FAQ Accordion */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-sentiment-pos" />
           Questions & Answers
        </h2>

        <div className="space-y-3">
          {vivaFaqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-surface-elevated border border-surface-border overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-surface/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-white">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-brand-cyan flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="p-4 pt-0 text-xs text-slate-300 font-sans leading-relaxed border-t border-surface-border/50 bg-ink-950/40">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Academic Literature Citations */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          Verified Scholarly Literature Citations
        </h2>

        <div className="p-6 rounded-2xl bg-surface-elevated border border-surface-border space-y-3 text-xs font-mono text-slate-300">
          <p className="border-b border-surface-border pb-2.5">
            1. <strong>Conneau, A., Khandelwal, K., Goyal, N., et al. (2020).</strong> <em>Unsupervised Cross-lingual Representation Learning at Scale.</em> Proceedings of ACL 2020, pp. 8440–8451. (Introduces XLM-RoBERTa trained across 100 languages).
          </p>
          <p className="border-b border-surface-border pb-2.5">
            2. <strong>Patwa, P., Aguilar, G., Kar, N. P., et al. (2020).</strong> <em>SemEval-2020 Task 9: Overview of Sentiment Analysis of Code-Mixed Tweets (SentiMix).</em> Proceedings of the 14th International Workshop on Semantic Evaluation, pp. 774–790.
          </p>
          <p className="border-b border-surface-border pb-2.5">
            3. <strong>Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2019).</strong> <em>BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding.</em> Proceedings of NAACL-HLT 2019, pp. 4171–4186.
          </p>
          <p className="border-b border-surface-border pb-2.5">
            4. <strong>Zeiler, M. D., & Fergus, R. (2014).</strong> <em>Visualizing and Understanding Convolutional Networks.</em> ECCV 2014 (Foundational occlusion sensitivity methodology adapted here for NLP token masking).
          </p>
          <p className="border-b border-surface-border pb-2.5">
            5. <strong>Guo, C., Pleiss, G., Sun, Y., & Weinberger, K. Q. (2017).</strong> <em>On Calibration of Modern Neural Networks.</em> ICML 2017 (Establishes Expected Calibration Error / ECE metric for neural probabilities).
          </p>
          <p>
            6. <strong>Jain, S., & Wallace, B. C. (2019).</strong> <em>Attention is not Explanation.</em> Proceedings of NAACL-HLT 2019, pp. 3543–3556. (Justifies occlusion sensitivity over attention maps).
          </p>
        </div>
      </section>

      {/* OpenAPI Specification Links */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
          <FileCode className="w-5 h-5 text-brand-cyan" />
          Backend API Endpoints Reference
        </h2>

        <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface-elevated">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-surface-border bg-ink-950 text-slate-400">
                <th className="p-3 w-20">Method</th>
                <th className="p-3 w-48">Endpoint</th>
                <th className="p-3">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border text-slate-300">
              <tr>
                <td className="p-3 text-sentiment-pos font-bold">GET</td>
                <td className="p-3 text-white">/api/health</td>
                <td className="p-3 font-sans text-slate-400">System health check and active inference model status</td>
              </tr>
              <tr>
                <td className="p-3 text-sentiment-pos font-bold">GET</td>
                <td className="p-3 text-white">/api/model-info</td>
                <td className="p-3 font-sans text-slate-400">Active model metadata, 10 supported languages, classes, device</td>
              </tr>
              <tr>
                <td className="p-3 text-brand-cyan font-bold">POST</td>
                <td className="p-3 text-white">/api/analyze</td>
                <td className="p-3 font-sans text-slate-400">Predict sentiment, language, confidence, and occlusion attribution</td>
              </tr>
              <tr>
                <td className="p-3 text-brand-cyan font-bold">POST</td>
                <td className="p-3 text-white">/api/analyze/batch</td>
                <td className="p-3 font-sans text-slate-400">Batch inference up to 500 records with skipped rows reporting</td>
              </tr>
              <tr>
                <td className="p-3 text-brand-cyan font-bold">POST</td>
                <td className="p-3 text-white">/api/analyze/upload-csv</td>
                <td className="p-3 font-sans text-slate-400">Multipart CSV upload, encoding detection, batch processing</td>
              </tr>
              <tr>
                <td className="p-3 text-sentiment-pos font-bold">GET</td>
                <td className="p-3 text-white">/api/analytics</td>
                <td className="p-3 font-sans text-slate-400">Serves genuine evaluation artifacts, ECE calibration, confusion matrix</td>
              </tr>
              <tr>
                <td className="p-3 text-brand-cyan font-bold">POST</td>
                <td className="p-3 text-white">/api/model/switch</td>
                <td className="p-3 font-sans text-slate-400">Dynamically switches active model between Baseline A, B, BiLSTM, XLM-R</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
