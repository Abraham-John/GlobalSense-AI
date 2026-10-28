import React, { useEffect, useState } from 'react';
import {
  Search,
  Globe,
  Sparkles,
  Layers,
  Activity,
  History,
  BookOpen,
  SlidersHorizontal,
  X,
  Cpu,
  Trash2,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string) => void;
  onSwitchModel: (modelKey: string) => void;
  onClearHistory: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSwitchModel,
  onClearHistory,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { id: 'landing', label: 'Go to Overview / Home', category: 'Navigation', icon: Globe, action: () => onNavigate('landing') },
    { id: 'analyze', label: 'Go to Analyze Workspace', category: 'Navigation', icon: Sparkles, action: () => onNavigate('analyze') },
    { id: 'batch', label: 'Go to Batch File Processing', category: 'Navigation', icon: Layers, action: () => onNavigate('batch') },
    { id: 'analytics', label: 'Go to Model Analytics & Metrics', category: 'Navigation', icon: Activity, action: () => onNavigate('analytics') },
    { id: 'history', label: 'Go to Prediction History', category: 'Navigation', icon: History, action: () => onNavigate('history') },
    { id: 'methodology', label: 'Go to NLP Methodology', category: 'Navigation', icon: SlidersHorizontal, action: () => onNavigate('methodology') },
    { id: 'docs', label: 'Go to Viva Defense & Docs', category: 'Navigation', icon: BookOpen, action: () => onNavigate('docs') },
    { id: 'switch_b', label: 'Switch to Baseline B (Word + Char n-gram)', category: 'Model', icon: Cpu, action: () => onSwitchModel('baseline_b') },
    { id: 'switch_bilstm', label: 'Switch to BiLSTM (PyTorch)', category: 'Model', icon: Cpu, action: () => onSwitchModel('bilstm') },
    { id: 'switch_a', label: 'Switch to Baseline A (Word TF-IDF)', category: 'Model', icon: Cpu, action: () => onSwitchModel('baseline_a') },
    { id: 'clear_hist', label: 'Clear Session History', category: 'Actions', icon: Trash2, action: () => onClearHistory() },
  ];

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-surface-elevated border border-surface-border shadow-2xl overflow-hidden animate-fade-in flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-surface-border bg-ink-950/60">
          <Search className="w-5 h-5 text-brand-cyan" />
          <input
            type="text"
            placeholder="Type a command or page (e.g. analyze, batch, model)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 font-mono">
              No matching actions found.
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-surface text-slate-200 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center text-slate-400 group-hover:text-brand-cyan group-hover:bg-brand-violet/20 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ink-950 text-slate-400 border border-surface-border uppercase">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-surface-border bg-ink-950/40 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Navigate with mouse or enter</span>
          <kbd className="px-1.5 py-0.5 rounded bg-surface border border-surface-border text-slate-300">
            Esc to exit
          </kbd>
        </div>
      </div>
    </div>
  );
};
