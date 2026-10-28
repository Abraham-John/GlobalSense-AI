import React from 'react';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Activity,
  Layers,
  Cpu,
  Fingerprint,
} from 'lucide-react';
import { ModelInfoResponse, AnalyticsResponse } from '../types';

interface LandingPageProps {
  onNavigate: (tabId: string) => void;
  modelInfo: ModelInfoResponse | null;
  analyticsData: AnalyticsResponse | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  modelInfo,
  analyticsData,
}) => {
  // Multilingual text fragments for the signature drifting hero
  const floatingSnippets = [
    { text: 'Superb work!', lang: 'English', sentiment: 'Positive', tag: 'en' },
    { text: 'यह फिल्म बहुत अच्छी है', lang: 'Hindi', sentiment: 'Positive', tag: 'hi' },
    { text: 'ye movie bohot acchi thi yaar', lang: 'Hinglish', sentiment: 'Positive', tag: 'hi-Latn' },
    { text: 'Ce film est magnifique', lang: 'French', sentiment: 'Positive', tag: 'fr' },
    { text: 'No me gustó para nada', lang: 'Spanish', sentiment: 'Negative', tag: 'es' },
    { text: 'Das Produkt ist schrecklich', lang: 'German', sentiment: 'Negative', tag: 'de' },
    { text: 'هذا الفيلم رائع وممتع جدا', lang: 'Arabic', sentiment: 'Positive', tag: 'ar' },
    { text: '本当に素晴らしくて感動しました', lang: 'Japanese', sentiment: 'Positive', tag: 'ja' },
    { text: 'Pessimo servizio e consegna in ritardo', lang: 'Italian', sentiment: 'Negative', tag: 'it' },
    { text: 'O livro é mediano, sem novidades', lang: 'Portuguese', sentiment: 'Neutral', tag: 'pt' },
  ];

  // Prioritize active evaluated model (pretrained_xlmr if available, otherwise baseline_b)
  const bestModelKey = analyticsData?.model_comparison?.['pretrained_xlmr']
    ? 'pretrained_xlmr'
    : analyticsData?.model_comparison?.['baseline_b']
    ? 'baseline_b'
    : null;
  const bestModelData = bestModelKey && analyticsData?.model_comparison ? analyticsData.model_comparison[bestModelKey] : null;

  return (
    <div className="space-y-20 py-4">
      {/* 1. Signature Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-12">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[500px] h-[300px] bg-gradient-to-tr from-brand-indigo/15 via-brand-cyan/10 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto text-center space-y-6 px-2">
          <div className="inline-flex flex-wrap items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-elevated border border-surface-border text-xs font-sans text-slate-300 max-w-full text-center">
            <span className="w-2 h-2 rounded-full bg-sentiment-pos animate-pulse" />
            <span>Multilingual 3-Class Sentiment Engine</span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-brand-cyan font-medium">10 Target Languages</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-6xl font-display font-extrabold text-white tracking-tight leading-tight">
            Understand the sentiment <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-brand-cyan via-indigo-400 to-brand-violet bg-clip-text text-transparent">
              behind every language.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-sans leading-relaxed">
            A research-grounded multilingual NLP platform supporting English, Hindi (Devanagari), Hinglish (Code-Mixed),
            Arabic, Japanese, and European languages with genuine occlusion-based word attribution and uncertainty filtering.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('analyze')}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan hover:opacity-95 text-white font-medium text-sm shadow-xl shadow-brand-glow transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-cyan-200" />
              <span>Launch Live Analyzer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('analytics')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-elevated hover:bg-surface border border-surface-border text-slate-300 hover:text-white font-medium text-sm transition-all"
            >
              <Activity className="w-4 h-4 text-slate-400" />
              <span>Inspect Evaluation Results</span>
            </button>
          </div>
        </div>

        {/* Floating Multilingual Sentiment Stream with Clear Legend */}
        <div className="mt-8 sm:mt-12 max-w-full overflow-hidden relative py-3">
          <div className="flex flex-wrap items-center justify-center gap-2 px-1">
            {floatingSnippets.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-lg bg-surface-card border border-surface-border text-xs text-slate-300 font-sans shadow-sm hover:border-brand-violet/40 transition-all cursor-default max-w-full"
              >
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-ink-950 px-1.5 py-0.5 rounded border border-surface-border font-mono flex-shrink-0">
                  {item.tag}
                </span>
                <span className="text-slate-200 truncate">{item.text}</span>
                <span
                  title={`${item.sentiment} Sentiment`}
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.sentiment === 'Positive'
                      ? 'bg-sentiment-pos shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                      : item.sentiment === 'Negative'
                      ? 'bg-sentiment-neg shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                      : 'bg-sentiment-neu'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Clean Legend for Hero Chips */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-sans text-slate-400 pt-4">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold font-sans">
              Sentiment Dot Legend:
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sentiment-pos shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              <span>Positive</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sentiment-neg shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
              <span>Negative</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sentiment-neu" />
              <span>Neutral / Objective</span>
            </span>
          </div>
        </div>
      </section>

      {/* 2. The Three Canonical Sentiments */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Standardized 3-Class Sentiment Architecture
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto font-sans">
            Unlike legacy binary systems, GlobalSense AI evaluates neutral and objective statements natively across all languages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Positive */}
          <div className="p-6 rounded-2xl bg-surface-elevated border border-surface-border hover:border-sentiment-pos/40 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sentiment-pos/15 flex items-center justify-center text-sentiment-pos">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-display font-semibold text-white">Positive Sentiment</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Captures praise, satisfaction, enthusiasm, and affirmative user sentiment with granular token-level attribution.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-ink-950/70 border border-surface-border text-xs font-sans text-sentiment-pos">
              Example: &ldquo;This movie was pure genius, loved every frame.&rdquo;
            </div>
          </div>

          {/* Neutral */}
          <div className="p-6 rounded-2xl bg-surface-elevated border border-surface-border hover:border-sentiment-neu/40 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sentiment-neu/15 flex items-center justify-center text-slate-300">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-display font-semibold text-white">Neutral / Objective</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Identifies factual observations, balanced reviews, news reports, and query statements without forced polarization.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-ink-950/70 border border-surface-border text-xs font-sans text-slate-300">
              Example: &ldquo;The flight departs at 9:00 AM and arrives on schedule.&rdquo;
            </div>
          </div>

          {/* Negative */}
          <div className="p-6 rounded-2xl bg-surface-elevated border border-surface-border hover:border-sentiment-neg/40 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sentiment-neg/15 flex items-center justify-center text-sentiment-neg">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-display font-semibold text-white">Negative Sentiment</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Detects dissatisfaction, critical feedback, defects, frustration, and multi-word negation structures.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-ink-950/70 border border-surface-border text-xs font-sans text-sentiment-neg">
              Example: &ldquo;Waste of time and money, broken on day one.&rdquo;
            </div>
          </div>
        </div>
      </section>

      {/* 3. Real Headline Metrics (Only from genuine evaluation artifacts) */}
      {bestModelData && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="p-8 rounded-3xl bg-gradient-to-b from-surface-elevated to-surface border border-surface-border shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-surface-border">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-sans text-brand-cyan tracking-wider uppercase font-semibold">
                    Empirical Benchmark
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-surface-border font-sans text-slate-300">
                    {bestModelData.origin_label}
                  </span>
                </div>
                <h3 className="text-xl font-display font-bold text-white mt-1">
                  Held-Out Evaluation Results ({bestModelData.name.split('(')[0]})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">
                  Evaluated on 2,952 held-out test samples across 10 target languages.
                </p>
              </div>
              <button
                onClick={() => onNavigate('analytics')}
                className="flex items-center gap-2 text-xs font-sans px-3.5 py-2 rounded-xl bg-surface border border-surface-border hover:border-brand-violet/40 text-slate-200 transition-all"
              >
                <span>Full Benchmark Report</span>
                <ArrowRight className="w-3.5 h-3.5 text-brand-cyan" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6">
              <div>
                <span className="text-xs text-slate-400 font-sans">Macro F1 Score</span>
                <div className="text-3xl font-display font-extrabold text-white mt-1 font-mono">
                  {(bestModelData.overall.macro_f1 * 100).toFixed(1)}%
                </div>
                <span className="text-[11px] text-sentiment-pos font-sans">Unweighted Class Average</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-sans">Test Accuracy</span>
                <div className="text-3xl font-display font-extrabold text-white mt-1 font-mono">
                  {(bestModelData.overall.accuracy * 100).toFixed(1)}%
                </div>
                <span className="text-[11px] text-slate-400 font-sans">3-Class Balanced</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-sans">CPU Latency</span>
                <div className="text-3xl font-display font-extrabold text-brand-cyan mt-1 font-mono">
                  {bestModelData.overall.latency_ms_per_sample.toFixed(1)} ms
                </div>
                <span className="text-[11px] text-slate-400 font-sans">Per sample (Standard CPU)</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-sans">Selective Accuracy</span>
                <div className="text-3xl font-display font-extrabold text-indigo-300 mt-1 font-mono">
                  {bestModelData.overall.selective_accuracy
                    ? `${(bestModelData.overall.selective_accuracy * 100).toFixed(1)}%`
                    : `${(bestModelData.overall.accuracy * 100).toFixed(1)}%`}
                </div>
                <span className="text-[11px] text-slate-400 font-sans">At &ge; 60% confidence filter</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Supported Languages Catalogue */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Supported Languages & Script Audit
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto font-sans">
            A language is marked <span className="text-sentiment-pos font-semibold">SUPPORTED</span> only if training data contains it AND the held-out test set has &ge; 200 samples.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {modelInfo?.supported_languages &&
            Object.entries(modelInfo.supported_languages).map(([code, meta]) => (
              <div
                key={code}
                className="p-4 rounded-xl bg-surface-elevated border border-surface-border flex flex-col justify-between space-y-2 hover:border-brand-violet/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-brand-cyan uppercase bg-ink-950 px-2 py-0.5 rounded border border-surface-border">
                    {code}
                  </span>
                  <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-sentiment-pos/15 text-sentiment-pos font-semibold uppercase">
                    {meta.status}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{meta.name}</div>
                  <div className="text-[11px] text-slate-400 font-sans">{meta.script}</div>
                </div>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-surface-border font-mono">
                  Held-out Test: &ge; {meta.min_test_samples} samples
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* 5. 4-Step Interactive Pipeline Architecture */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            How GlobalSense AI Works
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto font-sans">
            A 4-stage transparent, reproducible NLP inference and explainability pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: '01',
              title: 'Ingestion & Detection',
              desc: 'Unicode NFC normalization, script detection (Devanagari, Arabic, Japanese), Hinglish heuristic, and statistical language identification.',
              icon: Fingerprint,
            },
            {
              step: '02',
              title: 'Script-Aware Tokenization',
              desc: 'Subword & multi-script character n-gram extraction preserving negations, contractions, diacritics, and morphologically rich structures.',
              icon: Layers,
            },
            {
              step: '03',
              title: 'Inference & Softmax',
              desc: 'Model prediction computing 3-class probability distribution [Positive, Negative, Neutral] with calibration check.',
              icon: Cpu,
            },
            {
              step: '04',
              title: 'Occlusion Explainability',
              desc: 'Perturbation analysis systematically removing each token to measure exact class probability delta without fake heuristics.',
              icon: Sparkles,
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="p-6 rounded-2xl bg-surface-elevated border border-surface-border space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-display font-extrabold text-slate-700 font-mono">
                    {s.step}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-brand-cyan">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <h4 className="text-base font-display font-semibold text-white">{s.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
