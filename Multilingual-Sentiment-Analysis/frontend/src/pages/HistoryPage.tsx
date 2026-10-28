import React, { useState } from 'react';
import {
  History,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  Eye,
  X,
} from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryPageProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onSelectForAnalysis: (text: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  history,
  onClearHistory,
  onSelectForAnalysis,
}) => {
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Session Prediction History
          </h1>
          <p className="text-sm text-slate-400">
            Real-time session timeline. Persisted only in local browser memory and never stored permanently on backend servers.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-surface border border-surface-border text-xs font-mono text-rose-400 hover:text-rose-300 transition-all self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Session History</span>
          </button>
        )}
      </div>

      {/* Privacy Guarantee Pill */}
      <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border flex items-center justify-between text-xs font-mono text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sentiment-pos" />
          <span>Zero Server Text Retention: Inputs are processed in-memory and discarded immediately after prediction.</span>
        </div>
        <span className="text-slate-500 hidden sm:inline-block">Privacy-First Architecture</span>
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <div className="rounded-2xl bg-surface-elevated/40 border border-surface-border border-dashed p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-elevated flex items-center justify-center text-slate-500 mx-auto">
            <History className="w-6 h-6 text-brand-cyan/60" />
          </div>
          <h3 className="text-base font-display font-semibold text-slate-300">
            No Analyses Performed Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">
            Head over to the Analyze workspace to perform sentiment predictions. Your session results will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-surface-elevated border border-surface-border hover:border-surface-border-hover transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                      item.sentiment === 'Positive'
                        ? 'bg-sentiment-pos/15 text-sentiment-pos'
                        : item.sentiment === 'Negative'
                        ? 'bg-sentiment-neg/15 text-sentiment-neg'
                        : 'bg-slate-700/30 text-slate-300'
                    }`}
                  >
                    {item.sentiment} ({(item.confidence * 100).toFixed(0)}%)
                  </span>
                  <span className="text-slate-400 bg-ink-950 px-2 py-0.5 rounded border border-surface-border uppercase">
                    {item.language_name} ({item.language})
                  </span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.timestamp}
                  </span>
                </div>
                <p className="text-sm text-slate-200 truncate font-sans pr-4">
                  &ldquo;{item.text}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                <button
                  onClick={() => setSelectedItem(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-elevated border border-surface-border text-xs font-mono text-slate-300 transition-all"
                  title="Inspect Probabilities"
                >
                  <Eye className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>Inspect</span>
                </button>
                <button
                  onClick={() => onSelectForAnalysis(item.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-violet/20 hover:bg-brand-violet/30 border border-brand-violet/40 text-xs font-mono text-white transition-all"
                  title="Re-run in Editor"
                >
                  <span>Re-Analyze</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-elevated border border-surface-border p-6 shadow-2xl space-y-4 animate-fade-in relative">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="text-base font-display font-bold text-white">
                Prediction Details
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-slate-500 uppercase">Input Text</span>
                <p className="text-slate-200 mt-1 font-sans p-3 rounded-xl bg-ink-950 border border-surface-border text-sm leading-relaxed">
                  {selectedItem.text}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-ink-950 border border-surface-border">
                  <span className="text-slate-500 uppercase">Sentiment Verdict</span>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {selectedItem.sentiment} ({(selectedItem.confidence * 100).toFixed(1)}%)
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-ink-950 border border-surface-border">
                  <span className="text-slate-500 uppercase">Language</span>
                  <div className="text-lg font-bold text-brand-cyan mt-0.5">
                    {selectedItem.language_name} ({selectedItem.language})
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-ink-950 border border-surface-border">
                <span className="text-slate-500 uppercase">3-Class Probability Breakdown</span>
                <div className="flex justify-between pt-1">
                  <span className="text-sentiment-pos">Positive:</span>
                  <span className="text-white">{(selectedItem.probabilities.Positive * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sentiment-neg">Negative:</span>
                  <span className="text-white">{(selectedItem.probabilities.Negative * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Neutral:</span>
                  <span className="text-white">{(selectedItem.probabilities.Neutral * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
