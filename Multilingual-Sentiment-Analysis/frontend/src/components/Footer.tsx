import React from 'react';
import { Globe, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-surface-border bg-ink-950 text-slate-400 py-10 mt-20 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-brand-indigo flex items-center justify-center text-white">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <span className="font-display font-semibold text-white tracking-tight">
                GlobalSense AI
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-violet/20 text-brand-cyan font-mono">
                v2.1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 text-center md:text-left max-w-md font-sans">
              BCA 5th-Semester NLP Capstone Project. Genuine multilingual sentiment analysis across 10 languages with reproducible evaluation artifacts.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-sans">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-elevated border border-surface-border text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-sentiment-pos" />
              WCAG AA Contrast
            </span>
            <span className="px-2.5 py-1 rounded-md bg-surface-elevated border border-surface-border text-slate-300">
              Zero Leakage Stratified Split
            </span>
            <span className="px-2.5 py-1 rounded-md bg-surface-elevated border border-surface-border text-slate-300">
              Occlusion Explainability
            </span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-surface-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-sans text-slate-400">
          <p>© {new Date().getFullYear()} GlobalSense AI. Built for live viva demonstration and reproducible evaluation.</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 text-center max-w-md">
            <span className="text-slate-400 text-center leading-relaxed">
              English • Hindi • Hinglish • French • Spanish • German • Italian • Portuguese • Arabic • Japanese
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
