import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Globe,
  Cpu,
  Clock,
  Layers,
  Info,
  Check,
  AlertTriangle,
  Languages,
} from 'lucide-react';
import { api } from '../services/api';
import { AnalyzeResult, ModelInfoResponse, HistoryItem } from '../types';

interface AnalyzePageProps {
  modelInfo: ModelInfoResponse | null;
  onSaveHistory: (item: HistoryItem) => void;
  activeModelKey?: string;
  onSwitchModel?: (key: string) => void;
}

export const AnalyzePage: React.FC<AnalyzePageProps> = ({
  modelInfo,
  onSaveHistory,
  activeModelKey = 'pretrained_xlmr',
  onSwitchModel,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedLanguageOverride, setSelectedLanguageOverride] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [analyzeMode, setAnalyzeMode] = useState<'original' | 'translate_first'>('original');

  // One-click presets for all 10 supported languages
  const examplePresets = [
    {
      lang: 'English',
      code: 'en',
      text: 'This platform is absolutely magnificent, high-performing and beautifully designed!',
    },
    {
      lang: 'Hindi',
      code: 'hi',
      text: 'यह फिल्म बहुत ही सुंदर और भावनात्मक है, मुझे बहुत पसंद आई।',
    },
    {
      lang: 'Hinglish',
      code: 'hi-Latn',
      text: 'ye movie sach me bohot acchi thi yaar, acting ekdum zabardast thi!',
    },
    {
      lang: 'French',
      code: 'fr',
      text: "Ce restaurant était tout simplement incroyable, l'accueil était chaleureux.",
    },
    {
      lang: 'Spanish',
      code: 'es',
      text: 'El producto llegó completamente roto y el servicio al cliente fue pésimo.',
    },
    {
      lang: 'German',
      code: 'de',
      text: 'Das Buch ist sachlich informativ, aber stellenweise etwas langatmig.',
    },
    {
      lang: 'Italian',
      code: 'it',
      text: 'Una serata meravigliosa con amici, atmosfera davvero magica e piatti squisiti.',
    },
    {
      lang: 'Portuguese',
      code: 'pt',
      text: 'O atendimento foi razoável, porém a entrega demorou muito mais do que o previsto.',
    },
    {
      lang: 'Arabic',
      code: 'ar',
      text: 'هذا الفيلم رائع ومؤثر للغاية واستمتعت بكل لحظة فيه.',
    },
    {
      lang: 'Japanese',
      code: 'ja',
      text: 'この作品は本当に素晴らしくて、心から深く感動いたしました。',
    },
  ];

  // Live text metrics
  const charCount = inputText.length;
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const sentenceCount = inputText.trim()
    ? inputText.split(/[.!?।\u3002]+/).filter((s) => s.trim().length > 0).length
    : 0;
  const readingTimeSec = (wordCount / 200) * 60;

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to analyze
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (inputText.trim() && !isLoading) {
          handleAnalyze();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputText, isLoading, selectedLanguageOverride]);

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to analyze.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      if (analyzeMode === 'translate_first') {
        // Experimental translate-first pipeline
        const initial = await api.analyzeText(
          inputText,
          selectedLanguageOverride || undefined,
          true,
          true
        );

        if (initial.translation && initial.translation.status === 'success' && initial.translation.text) {
          const transResult = await api.analyzeText(initial.translation.text, 'en', true, false);
          transResult.text = inputText;
          transResult.translation = initial.translation;
          transResult.disclaimer = `[Analyze Mode: Translate-First Experimental] Evaluated on English translation ("${initial.translation.text}"). Direct multilingual inference remains the recommended default.`;
          setResult(transResult);

          const historyRecord: HistoryItem = {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            text: inputText,
            sentiment: transResult.sentiment,
            confidence: transResult.confidence,
            language: initial.language.language_code,
            language_name: initial.language.language_name,
            probabilities: transResult.probabilities,
          };
          onSaveHistory(historyRecord);
        } else {
          setResult(initial);
          const historyRecord: HistoryItem = {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            text: initial.text,
            sentiment: initial.sentiment,
            confidence: initial.confidence,
            language: initial.language.language_code,
            language_name: initial.language.language_name,
            probabilities: initial.probabilities,
          };
          onSaveHistory(historyRecord);
        }
      } else {
        // Default mode: Original text inference (sentiment NEVER changed by translation)
        const data = await api.analyzeText(
          inputText,
          selectedLanguageOverride || undefined,
          true,
          showTranslation
        );
        setResult(data);

        // Save to session history
        const historyRecord: HistoryItem = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          text: data.text,
          sentiment: data.sentiment,
          confidence: data.confidence,
          language: data.language.language_code,
          language_name: data.language.language_name,
          probabilities: data.probabilities,
        };
        onSaveHistory(historyRecord);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || 'Analysis failed. Please check if backend is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTranslation = async () => {
    const nextState = !showTranslation;
    setShowTranslation(nextState);

    if (nextState && result && !result.translation) {
      setIsTranslating(true);
      try {
        const transRes = await api.analyzeText(
          result.text,
          result.language.language_code,
          false,
          true
        );
        if (transRes.translation) {
          setResult((prev) => (prev ? { ...prev, translation: transRes.translation } : null));
        }
      } catch (err) {
        console.error('Translation fetch failed:', err);
      } finally {
        setIsTranslating(false);
      }
    }
  };

  const handleClear = () => {
    setInputText('');
    setResult(null);
    setError(null);
  };

  const handlePresetClick = (presetText: string, presetCode: string) => {
    setInputText(presetText);
    setSelectedLanguageOverride(presetCode);
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
          Interactive Sentiment Analysis Workspace
        </h1>
        <p className="text-sm text-slate-400">
          Enter text in any supported language to compute 3-class sentiment confidence and occlusion word attribution.
        </p>
      </div>

      {/* Preset Pills */}
      <div className="space-y-2">
        <span className="text-xs font-sans text-slate-400 uppercase tracking-wider font-semibold">
          One-Click Multilingual Examples
        </span>
        <div className="flex flex-wrap gap-2">
          {examplePresets.map((preset) => (
            <button
              key={preset.code}
              onClick={() => handlePresetClick(preset.text, preset.code)}
              className="text-xs font-sans px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-surface-border hover:border-brand-violet/40 text-slate-300 transition-all flex items-center gap-1.5"
            >
              <span className="text-brand-cyan font-bold uppercase font-mono">{preset.code}</span>
              <span>{preset.lang}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Text Input & Controls */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl bg-surface-elevated border border-surface-border p-4 shadow-xl space-y-3">
            {/* Top Toolbar */}
            <div className="space-y-2.5 pb-3 border-b border-surface-border text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Visible Model Selector inside Analyze Workspace */}
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-brand-violet" />
                  <span className="text-slate-300 font-mono font-medium">Model:</span>
                  <select
                    value={activeModelKey || 'pretrained_xlmr'}
                    onChange={(e) => onSwitchModel && onSwitchModel(e.target.value)}
                    className="bg-ink-950 text-slate-200 border border-surface-border rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-brand-violet hover:border-brand-violet/50 transition-colors cursor-pointer"
                    title="Switch active inference model"
                  >
                    <option value="pretrained_xlmr">XLM-RoBERTa Pretrained (CardiffNLP — Acc: 63.3%, F1: 0.610)</option>
                    <option value="baseline_b">Baseline B (TF-IDF + Logistic Reg — Acc: 62.6%, F1: 0.603)</option>
                    <option value="baseline_a">Baseline A (Word TF-IDF — Acc: 46.2%, F1: 0.449)</option>
                    <option value="bilstm">Deep Learning BiLSTM (Acc: 48.1%, F1: 0.457)</option>
                  </select>
                </div>

                {/* Shortcut Hint */}
                <span className="hidden sm:inline-block font-mono text-[11px] text-slate-500">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-ink-950 text-slate-400 border border-surface-border">Ctrl+Enter</kbd> to analyze
                </span>
              </div>

              {/* Language Override & Analyze Mode */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-surface-border/50">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-brand-cyan" />
                  <span className="text-slate-400 font-mono">Language Mode:</span>
                  <select
                    value={selectedLanguageOverride}
                    onChange={(e) => setSelectedLanguageOverride(e.target.value)}
                    className="bg-ink-950 text-slate-200 border border-surface-border rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-brand-violet"
                  >
                    <option value="">Auto-Detect (Recommended)</option>
                    {modelInfo?.supported_languages &&
                      Object.entries(modelInfo.supported_languages).map(([code, meta]) => (
                        <option key={code} value={code}>
                          {meta.name} ({code})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Analyze Mode Selector */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-slate-400 font-mono text-xs">Analyze mode:</span>
                  <label className="flex items-center gap-1.5 text-xs font-mono cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="radio"
                      name="analyzeMode"
                      value="original"
                      checked={analyzeMode === 'original'}
                      onChange={() => setAnalyzeMode('original')}
                      className="accent-brand-cyan cursor-pointer"
                    />
                    <span>Original text <span className="text-slate-500 font-normal"></span></span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-mono cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="radio"
                      name="analyzeMode"
                      value="translate_first"
                      checked={analyzeMode === 'translate_first'}
                      onChange={() => setAnalyzeMode('translate_first')}
                      className="accent-brand-cyan cursor-pointer"
                    />
                    <span>Translate to English first <span className="text-amber-400/90 font-semibold"></span></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Main Textarea */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste or type text in English, Hindi, Hinglish, French, Spanish, German, Italian, Portuguese, Arabic, or Japanese..."
              rows={8}
              className="w-full bg-ink-950/60 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 border border-surface-border focus:border-brand-violet focus:ring-1 focus:ring-brand-violet focus:outline-none transition-all resize-y leading-relaxed"
            />

            {/* Bottom Live Metrics & Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              {/* Live Character / Word / Sentence counters */}
              <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                <span>{charCount} chars</span>
                <span>•</span>
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{sentenceCount} sentences</span>
                <span>•</span>
                <span>~{readingTimeSec.toFixed(1)}s read</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClear}
                  disabled={!inputText && !result}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white bg-surface hover:bg-surface-elevated border border-surface-border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={isLoading || !inputText.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan hover:opacity-95 text-white font-medium text-xs font-mono shadow-lg shadow-brand-glow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                      <span>Analyze Sentiment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error notice if any */}
          {error && (
            <div className="p-4 rounded-xl bg-sentiment-neg/10 border border-sentiment-neg/30 text-sentiment-neg text-xs font-mono flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column: Prediction Result Panel */}
        <div className="lg:col-span-5 space-y-4">
          {result ? (
            <div className="rounded-2xl bg-surface-elevated border border-surface-border p-6 shadow-2xl space-y-6 animate-fade-in">
              {/* Top Verdict Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-surface-border">
                <div className="space-y-1">
                  <span className="text-[11px] font-sans text-slate-400 uppercase tracking-wider font-semibold">
                    Model Verdict
                  </span>
                  <div className="flex items-center gap-2.5">
                    {result.sentiment === 'Positive' && (
                      <CheckCircle2 className="w-7 h-7 text-sentiment-pos" />
                    )}
                    {result.sentiment === 'Negative' && (
                      <AlertCircle className="w-7 h-7 text-sentiment-neg" />
                    )}
                    {result.sentiment === 'Neutral' && (
                      <HelpCircle className="w-7 h-7 text-slate-300" />
                    )}
                    {result.sentiment === 'Uncertain' && (
                      <AlertTriangle className="w-7 h-7 text-amber-400" />
                    )}
                    <span
                      className={`text-2xl font-display font-extrabold ${
                        result.sentiment === 'Positive'
                          ? 'text-sentiment-pos'
                          : result.sentiment === 'Negative'
                          ? 'text-sentiment-neg'
                          : result.sentiment === 'Uncertain'
                          ? 'text-amber-400'
                          : 'text-slate-200'
                      }`}
                    >
                      {result.sentiment}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-sans text-slate-400 uppercase tracking-wider font-semibold">
                    Confidence
                  </span>
                  <div className="text-2xl font-mono font-bold text-white">
                    {(result.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Uncertainty Warning Notice if confidence < 0.60 */}
              {(result.is_uncertain || result.uncertainty_notice) && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-sans flex items-start gap-2.5 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                  <div className="space-y-1">
                    <span className="font-semibold block">Under-Confident Prediction</span>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      {result.uncertainty_notice ||
                        `Confidence is below the 60% reliability threshold. Raw model prediction was ${result.raw_sentiment || 'ambiguous'}. Manual review recommended.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Language & Engine Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-ink-950/70 border border-surface-border space-y-1">
                  <span className="text-[10px] font-sans text-slate-400 uppercase">
                    Detected Language
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Globe className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>{result.language.language_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({(result.language.confidence * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-ink-950/70 border border-surface-border space-y-1">
                  <span className="text-[10px] font-sans text-slate-400 uppercase">
                    Inference Engine
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white truncate">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <span className="truncate">{result.model.name.split('(')[0]}</span>
                  </div>
                  <div className="text-[10px] text-brand-cyan font-sans truncate">
                    {result.model.origin_label || (result.model.origin === 'pretrained' ? 'Pretrained Checkpoint (CardiffNLP)' : 'Trained Locally')}
                  </div>
                </div>
              </div>

              {/* 3-Class Probability Bars */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Class Confidence Distribution</span>
                  <span>Softmax Output</span>
                </div>

                {/* Positive */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-sentiment-pos font-medium">Positive</span>
                    <span className="text-slate-300">
                      {(result.probabilities.Positive * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-ink-950 overflow-hidden">
                    <div
                      className="h-full bg-sentiment-pos rounded-full transition-all duration-500"
                      style={{ width: `${result.probabilities.Positive * 100}%` }}
                    />
                  </div>
                </div>

                {/* Negative */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-sentiment-neg font-medium">Negative</span>
                    <span className="text-slate-300">
                      {(result.probabilities.Negative * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-ink-950 overflow-hidden">
                    <div
                      className="h-full bg-sentiment-neg rounded-full transition-all duration-500"
                      style={{ width: `${result.probabilities.Negative * 100}%` }}
                    />
                  </div>
                </div>

                {/* Neutral */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400 font-medium">Neutral</span>
                    <span className="text-slate-300">
                      {(result.probabilities.Neutral * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-ink-950 overflow-hidden">
                    <div
                      className="h-full bg-slate-500 rounded-full transition-all duration-500"
                      style={{ width: `${result.probabilities.Neutral * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Occlusion-Based Word Attribution Visualization */}
              {result.explanation && result.explanation.tokens.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-surface-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-300 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                      Occlusion-Based Word Importance
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Hover tokens for impact
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-ink-950/80 border border-surface-border flex flex-wrap gap-1.5 leading-relaxed">
                    {result.explanation.tokens.map((tk, idx) => {
                      let bgStyle = 'bg-surface-elevated text-slate-300 border-surface-border';
                      if (tk.impact === 'supports') {
                        bgStyle = 'bg-sentiment-pos/20 text-emerald-300 border-sentiment-pos/40 font-semibold';
                      } else if (tk.impact === 'opposes') {
                        bgStyle = 'bg-sentiment-neg/20 text-rose-300 border-sentiment-neg/40 font-semibold';
                      }

                      return (
                        <div
                          key={idx}
                          title={`Token: "${tk.token}" | Impact: ${tk.impact} | Occlusion Score: ${tk.score} (Raw Δ: ${tk.raw_delta})`}
                          className={`px-2 py-0.5 rounded-md text-xs font-mono border transition-all cursor-help relative group select-none ${bgStyle}`}
                        >
                          <span>{tk.token}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sentiment-pos" /> Supports verdict
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sentiment-neg" /> Opposes verdict
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-500" /> Neutral
                    </span>
                  </div>
                </div>
              )}

              {/* Machine Translation Section */}
              <div className="pt-2 border-t border-surface-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-brand-cyan" />
                    <span className="text-xs font-mono text-slate-300 font-semibold">
                      English Translation
                    </span>
                  </div>
                  <span className="text-[10px] font-sans text-slate-400 bg-surface px-2 py-0.5 rounded border border-surface-border">
                    Machine translation, may be inaccurate
                  </span>
                </div>

                {isTranslating ? (
                  <div className="p-3 rounded-xl bg-ink-950/70 border border-surface-border flex items-center gap-2 text-xs font-mono text-slate-400">
                    <div className="w-3.5 h-3.5 border-2 border-brand-cyan/30 border-t-brand-cyan rounded-full animate-spin" />
                    <span>Translating with Helsinki-NLP opus-mt...</span>
                  </div>
                ) : result.translation ? (
                  result.translation.status === 'success' ? (
                    <div className="p-3 rounded-xl bg-ink-950/70 border border-surface-border space-y-2 animate-fade-in">
                      <div className="text-xs text-slate-200 font-sans leading-relaxed">
                        "{result.translation.text}"
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-surface-border/50">
                        <span>Model: {result.translation.model}</span>
                        <span>Latency: {result.translation.latency_ms.toFixed(1)} ms</span>
                      </div>
                    </div>
                  ) : result.translation.status === 'same_language' ? (
                    <div className="p-2.5 rounded-lg bg-surface border border-surface-border text-xs font-mono text-slate-400">
                      Text is already in English. Translation not required.
                    </div>
                  ) : result.translation.status === 'not_available' ? (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300">
                      {result.translation.message || 'Translation not available for this language'}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs font-mono text-rose-300">
                      Translation Error: {result.translation.message || 'Model failed to translate text'}
                    </div>
                  )
                ) : (
                  <button
                    onClick={handleToggleTranslation}
                    className="w-full py-2 px-3 rounded-xl bg-surface hover:bg-surface-elevated border border-surface-border hover:border-brand-cyan/40 text-xs font-mono text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Languages className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>Show English translation</span>
                  </button>
                )}
              </div>

              {/* Bottom Latency & Disclaimer */}
              <div className="pt-2 border-t border-surface-border space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-brand-cyan" />
                    Latency: {result.latency_ms.toFixed(1)} ms
                  </span>
                  <span>Origin: {result.model.origin}</span>
                </div>
                <div className="p-2 rounded-lg bg-surface border border-surface-border text-[11px] text-slate-400 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>{result.disclaimer}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] rounded-2xl bg-surface-elevated/40 border border-surface-border border-dashed p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-surface-elevated flex items-center justify-center text-slate-500">
                <Sparkles className="w-6 h-6 text-brand-cyan/60" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-display font-semibold text-slate-300">
                  Ready for Analysis
                </h4>
                <p className="text-xs text-slate-500 max-w-xs font-sans">
                  Select a multilingual example above or paste custom text to generate instant sentiment probabilities and word attribution.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
