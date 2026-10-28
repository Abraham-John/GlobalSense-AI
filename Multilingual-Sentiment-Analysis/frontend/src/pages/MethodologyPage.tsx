import React from 'react';
import {
  Layers,
  Fingerprint,
  Cpu,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Code2,
  Database,
  Sliders,
} from 'lucide-react';

export const MethodologyPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 py-4">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-4xl font-display font-bold text-white tracking-tight">
          NLP Methodology & Engineering Architecture
        </h1>
        <p className="text-sm sm:text-base text-slate-400 font-sans leading-relaxed">
          Technical documentation of data curation, stratified partitioning, multilingual tokenization, baseline workflows, and occlusion-based explainability.
        </p>
      </div>

      {/* Visual Pipeline Flow */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-brand-cyan" />
          End-to-End Processing Architecture
        </h2>

        <div className="p-6 rounded-2xl bg-surface-elevated border border-surface-border space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-ink-950/70 border border-surface-border space-y-2">
              <span className="text-[10px] font-mono text-brand-cyan uppercase font-bold">Phase 1</span>
              <h4 className="text-sm font-semibold text-white">Ingest & Normalize</h4>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Unicode NFC composition, control-char stripping, whitespace regularization, and zero-leakage deduplication.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-ink-950/70 border border-surface-border space-y-2">
              <span className="text-[10px] font-mono text-brand-cyan uppercase font-bold">Phase 2</span>
              <h4 className="text-sm font-semibold text-white">Language & Script ID</h4>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Multi-tier detection: Unicode block classification (Devanagari/Arabic/JP) + Roman-script Hinglish heuristic + Lingua n-gram statistical model.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-ink-950/70 border border-surface-border space-y-2">
              <span className="text-[10px] font-mono text-brand-cyan uppercase font-bold">Phase 3</span>
              <h4 className="text-sm font-semibold text-white">Model Classification</h4>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Word+Char n-gram TF-IDF Pipeline (Baseline B) or PyTorch BiLSTM computing 3-class probability distribution [Positive, Negative, Neutral].
              </p>
            </div>
            <div className="p-4 rounded-xl bg-ink-950/70 border border-surface-border space-y-2">
              <span className="text-[10px] font-mono text-brand-cyan uppercase font-bold">Phase 4</span>
              <h4 className="text-sm font-semibold text-white">Occlusion Attribution</h4>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Systematic word masking perturbation to calculate genuine delta probability shifts without fabricated attention heatmaps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dataset Curation & Partitioning */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-brand-indigo" />
          Corpus Curation & Partitioning Protocol
        </h2>
        <div className="p-6 rounded-2xl bg-surface-elevated border border-surface-border space-y-4 text-xs font-sans text-slate-300 leading-relaxed">
          <p>
            To prevent cross-split data leakage, the corpus is partitioned using a strict stratified 75% train / 10% validation / 15% test split anchored to seed 42. Stratification occurs across both language and sentiment classes simultaneously.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-400 font-mono">
            <li><strong>clapAI/MultiLingualSentiment (Apache-2.0):</strong> Provides balanced 3-class reviews for English, French, Spanish, German, Italian, Portuguese, Arabic, and Japanese.</li>
            <li><strong>iam-tsr/hindi-sentiments (MIT):</strong> Supplies pure Devanagari Hindi reviews balanced across Positive, Negative, and Neutral.</li>
            <li><strong>shae2977/hinglish-youtube-sentiments-dataset (CC-BY-4.0):</strong> Supplies 3,190 legitimate, code-mixed Roman-script comments.</li>
          </ul>
          <p className="text-slate-400">
            A language is strictly audited and verified to contain &ge; 200 held-out test samples before receiving the <span className="text-sentiment-pos font-mono font-semibold">SUPPORTED</span> status badge.
          </p>
        </div>
      </section>

      {/* Model Architectures Comparison */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-brand-cyan" />
          Comparative Model Architectures
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-surface-elevated border border-surface-border space-y-2">
            <h4 className="text-sm font-display font-bold text-white">Baseline A: Word TF-IDF</h4>
            <p className="text-xs text-slate-400">
              Direct evolution of the original CineSense AI workflow. Uses sublinear TF word unigrams and multinomial Logistic Regression with balanced class weighting. Ultra-fast CPU latency (0.04 ms).
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-surface-elevated border border-surface-border space-y-2">
            <h4 className="text-sm font-display font-bold text-white">Baseline B: Word + Char n-gram</h4>
            <p className="text-xs text-slate-400">
              Unicode-safe FeatureUnion combining word (1-2) n-grams and character (2-5) n-grams. Retains diacritics, negations, and Devanagari morphological stems. Achieves top CPU performance (0.625 Macro-F1).
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-surface-elevated border border-surface-border space-y-2">
            <h4 className="text-sm font-display font-bold text-white">BiLSTM (PyTorch)</h4>
            <p className="text-xs text-slate-400">
              2-Layer Bidirectional LSTM with subword/char-aware tokenizer vocabulary of 15,000 tokens. Uses masked mean+max concat pooling to capture bidirectional context across unsegmented and code-mixed scripts.
            </p>
          </div>
        </div>
      </section>

      {/* Occlusion Explainability Mathematical Formulation */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
          <Code2 className="w-5 h-5 text-emerald-400" />
          Mathematical Formulation of Occlusion Sensitivity
        </h2>
        <div className="p-6 rounded-2xl bg-surface-elevated border border-surface-border space-y-3 font-mono text-xs text-slate-300">
          <p className="text-slate-400 font-sans">
            Rather than displaying fabricated attention weights or static keyword dictionaries, GlobalSense AI executes input perturbation:
          </p>
          <div className="p-4 rounded-xl bg-ink-950 border border-surface-border text-center text-brand-cyan text-sm">
            {"ΔP(y | wᵢ) = P(y | x) - P(y | x \\ {wᵢ})"}
          </div>
          <p className="text-slate-400 font-sans leading-relaxed">
            Where <code>x</code> is the complete input text, <code>x \ {"{wᵢ}"}</code> is the sequence omitting token <code>wᵢ</code>, and <code>y</code> is the predicted sentiment class. A positive delta indicates the word supported the prediction; a negative delta indicates it opposed the verdict.
          </p>
        </div>
      </section>

      {/* Limitations & Ethical NLP */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          Known Limitations & Ethical Considerations
        </h2>
        <div className="p-6 rounded-2xl bg-surface-elevated border border-surface-border space-y-3 text-xs text-slate-400 font-sans leading-relaxed">
          <p>
            1. <strong>Sarcasm & Irony:</strong> Classical n-gram and shallow RNN models struggle with inverted pragmatic sentiment (&ldquo;What a joy to wait 4 hours for a cold pizza&rdquo;).
          </p>
          <p>
            2. <strong>Code-Mixing Phonetics:</strong> Hinglish exhibits non-standardized phonetic spellings (e.g., <em>achha</em>, <em>accha</em>, <em>achaa</em>). Subword and character n-grams mitigate but do not entirely eliminate vocabulary drift.
          </p>
          <p>
            3. <strong>Probabilistic Disclaimer:</strong> Softmax scores represent mathematical model confidence within the learned hypothesis space, not objective certainty of human emotional intent.
          </p>
        </div>
      </section>
    </div>
  );
};
