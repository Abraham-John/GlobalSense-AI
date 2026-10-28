import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Globe,
  SlidersHorizontal,
  Moon,
  Sun,
  Search,
  Activity,
  Layers,
  History,
  BookOpen,
  Sparkles,
  Menu,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { ModelInfoResponse, HealthResponse } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  modelInfo: ModelInfoResponse | null;
  healthData: HealthResponse | null;
  backendStatus: 'connected' | 'unreachable' | 'loading';
  isDarkMode: boolean;
  toggleTheme: () => void;
  onOpenCommandPalette: () => void;
  onSwitchModel?: (modelKey: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  modelInfo,
  healthData,
  backendStatus,
  isDarkMode,
  toggleTheme,
  onOpenCommandPalette,
  onSwitchModel,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statusDetailsOpen, setStatusDetailsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; right: number; width: number }>({
    top: 68,
    right: 16,
    width: 320,
  });

  const updatePopoverPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      // Clamped right offset so it stays completely inside viewport at 1440, 820, and 390 px
      const offsetRight = Math.max(12, Math.min(viewportWidth - 12, viewportWidth - rect.right));
      const width = Math.min(320, viewportWidth - 24);
      setPopoverCoords({
        top: rect.bottom + 8,
        right: offsetRight,
        width: width,
      });
    }
  };

  useEffect(() => {
    if (statusDetailsOpen) {
      updatePopoverPosition();
      window.addEventListener('resize', updatePopoverPosition);
      window.addEventListener('scroll', updatePopoverPosition);
      return () => {
        window.removeEventListener('resize', updatePopoverPosition);
        window.removeEventListener('scroll', updatePopoverPosition);
      };
    }
  }, [statusDetailsOpen]);

  // 7 nav items — no wrapping
  const navItems = [
    { id: 'landing', label: 'Overview', icon: Globe },
    { id: 'analyze', label: 'Analyze', icon: Sparkles },
    { id: 'batch', label: 'Batch', icon: Layers },
    { id: 'analytics', label: 'Analytics', icon: Activity },
    { id: 'history', label: 'History', icon: History },
    { id: 'methodology', label: 'Methodology', icon: SlidersHorizontal },
    { id: 'docs', label: 'Docs', icon: BookOpen },
  ];

  // Distinct pill states — short label for header, full detail in popover
  let pillState: {
    statusType: 'ready' | 'loading' | 'unreachable' | 'failed';
    shortLabel: string;    // ≤ 20 chars for pill
    dotColor: string;
    badgeStyle: string;
    detailTitle: string;   // full name for popover
    details: string;
  };

  if (backendStatus === 'unreachable') {
    pillState = {
      statusType: 'unreachable',
      shortLabel: 'Backend Offline',
      dotColor: 'bg-rose-500',
      badgeStyle: 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20',
      detailTitle: 'Backend Offline — Port 8000',
      details: 'FastAPI backend is unreachable on http://127.0.0.1:8000. Start with: python -m uvicorn app.main:app --port 8000',
    };
  } else if (backendStatus === 'loading' || !healthData) {
    pillState = {
      statusType: 'loading',
      shortLabel: 'Connecting…',
      dotColor: 'bg-amber-400 animate-pulse',
      badgeStyle: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
      detailTitle: 'Establishing connection',
      details: 'Probing local FastAPI service on port 8000.',
    };
  } else if (healthData.model_state?.startsWith('model failed')) {
    pillState = {
      statusType: 'failed',
      shortLabel: 'Model Failed',
      dotColor: 'bg-rose-500',
      badgeStyle: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
      detailTitle: 'Model Failed to Load',
      details: healthData.model_state,
    };
  } else if (healthData.model_state === 'model loading') {
    pillState = {
      statusType: 'loading',
      shortLabel: 'Model Loading…',
      dotColor: 'bg-amber-400 animate-pulse',
      badgeStyle: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
      detailTitle: 'Loading model weights',
      details: 'Transformer weights are being loaded into CPU memory.',
    };
  } else {
    const isPretrained = healthData.active_model_key === 'pretrained_xlmr' || healthData.model_origin === 'pretrained';
    pillState = {
      statusType: 'ready',
      // Short pill text: ≤ 20 chars so it never stretches the header
      shortLabel: isPretrained ? 'XLM-R · Pretrained' : (healthData.active_model_key ?? 'Ready'),
      dotColor: 'bg-emerald-400',
      badgeStyle: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20',
      detailTitle: healthData.active_model,
      // Full attribution goes here, not in pill
      details: isPretrained
        ? 'CardiffNLP checkpoint — not trained by this project. Evaluated zero-shot on held-out test set (2,952 samples). Macro-F1 0.6096, Acc 63.25%.'
        : `${healthData.active_model} — trained locally. ${healthData.results_status === 'results loaded' ? 'Evaluated on held-out test set.' : 'Evaluation pending.'}`,
    };
  }

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-surface-border bg-ink-950/90 backdrop-blur-md transition-colors">
      {/* Single row — never wraps, nothing clips */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center gap-2 sm:gap-3 w-full overflow-hidden">

        {/* ── Brand ── shrink-0 so nav never squeezes it */}
        <div
          onClick={() => handleNavClick('landing')}
          className="flex items-center gap-2 cursor-pointer group select-none shrink-0"
        >
          {/* Logo icon */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-indigo to-brand-cyan flex items-center justify-center text-white shadow-lg shadow-brand-glow shrink-0">
            <Globe className="w-4 h-4 transition-transform group-hover:rotate-12 duration-300" />
          </div>

          {/* Name + AI badge + tagline all in ONE flex row */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-display font-bold text-sm sm:text-base text-white tracking-tight whitespace-nowrap leading-none">
              GlobalSense AI
            </span>
            {/* Tagline: visible only at xl+ so it never crowds the nav */}
            <span className="hidden xl:inline text-[10px] text-slate-400 font-sans whitespace-nowrap leading-none ml-1">
            
            </span>
          </div>
        </div>

        {/* ── Desktop Navigation — flex-1 min-w-0, no wrap, hidden below 1280px ── */}
        <nav className="hidden xl:flex flex-1 min-w-0 items-center justify-center gap-0.5 overflow-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-sans font-medium transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-surface-elevated text-white border border-surface-border shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-brand-cyan' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── Right-side controls — shrink-0 ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
          {/* Command Palette Trigger */}
          <button
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-400 bg-surface-elevated hover:bg-surface hover:text-slate-200 border border-surface-border rounded-lg transition-all font-sans shrink-0"
            title="Open command palette (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Search</span>
          </button>

          {/* ── Status Pill — compact, never overflows ── */}
          <div className="relative shrink-0">
            <button
              ref={buttonRef}
              onClick={() => {
                if (!statusDetailsOpen) {
                  updatePopoverPosition();
                }
                setStatusDetailsOpen(!statusDetailsOpen);
              }}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-sans rounded-lg border transition-all shrink-0 ${pillState.badgeStyle}`}
              title="Click for engine status details and model switcher"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${pillState.dotColor}`} />
              <span className="font-semibold whitespace-nowrap hidden sm:inline">{pillState.shortLabel}</span>
              <span className="font-semibold whitespace-nowrap sm:hidden">XLM-R</span>
            </button>
          </div>

          {/* ── Status & Model Popover rendered via Portal into document.body ── */}
          {statusDetailsOpen && typeof document !== 'undefined' && createPortal(
            <>
              {/* Outside-click backdrop */}
              <div
                className="fixed inset-0 z-50 bg-black/20"
                onClick={() => setStatusDetailsOpen(false)}
              />

              {/* Popover Floating Card */}
              <div
                style={{
                  position: 'fixed',
                  top: `${popoverCoords.top}px`,
                  right: `${popoverCoords.right}px`,
                  width: `${popoverCoords.width}px`,
                  maxWidth: 'calc(100vw - 24px)',
                }}
                className="z-50 rounded-xl bg-surface-elevated border border-surface-border shadow-2xl p-3.5 text-xs font-sans space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    {pillState.statusType === 'ready' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    )}
                    System Status & Engine
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">v2.1.0</span>
                </div>

                <div className="space-y-1.5 text-slate-300">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Inference Engine:</span>
                    <span className="font-medium text-white max-w-[180px] text-right leading-tight">{pillState.detailTitle}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Model Origin:</span>
                    <span className="font-mono text-brand-cyan">
                      {healthData?.model_origin === 'pretrained' ? 'CardiffNLP Checkpoint' : 'Trained Locally'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Results:</span>
                    <span className={`font-medium ${healthData?.results_status === 'results loaded' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {healthData?.results_status === 'results loaded' ? 'Loaded (2,952 samples)' : 'Not Generated'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Uncertainty Filter:</span>
                    <span className="font-mono text-indigo-300">≥ 60% Confidence</span>
                  </div>
                </div>

                {/* Model switcher dropdown inside portal */}
                {onSwitchModel && (
                  <div className="pt-2 border-t border-surface-border">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-slate-300 font-medium">Switch Active Model:</span>
                    </div>
                    <select
                      value={healthData?.active_model_key || 'pretrained_xlmr'}
                      onChange={(e) => {
                        onSwitchModel(e.target.value);
                      }}
                      className="w-full bg-ink-950 text-slate-200 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-brand-violet cursor-pointer"
                    >
                      <option value="pretrained_xlmr">Pretrained XLM-R (CardiffNLP, Acc: 63.3%)</option>
                      <option value="baseline_b">Baseline B (TF-IDF + LogReg, Acc: 62.6%)</option>
                      <option value="baseline_a">Baseline A (Word TF-IDF, Acc: 46.2%)</option>
                      <option value="bilstm">Deep Learning BiLSTM (Acc: 48.1%)</option>
                    </select>
                  </div>
                )}

                <div className="p-2 rounded-lg bg-ink-950/70 border border-surface-border text-[11px] text-slate-400 leading-relaxed">
                  {pillState.details}
                </div>

                <button
                  onClick={() => setStatusDetailsOpen(false)}
                  className="w-full py-1 text-center text-[10px] text-slate-400 hover:text-white rounded bg-surface hover:bg-surface-elevated transition-colors"
                >
                  Close
                </button>
              </div>
            </>,
            document.body
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="hidden sm:flex p-2 rounded-lg bg-surface-elevated hover:bg-surface border border-surface-border text-slate-400 hover:text-slate-200 transition-all shrink-0"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {/* Hamburger for < 1280px (xl breakpoint) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-lg bg-surface-elevated hover:bg-surface border border-surface-border text-slate-400 hover:text-white transition-all shrink-0"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Slide-down drawer for < 1280px */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-surface-border bg-ink-950/95 backdrop-blur-md px-4 py-3 space-y-1 shadow-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-sans font-medium transition-all ${
                  isActive
                    ? 'bg-surface-elevated text-white border border-surface-border'
                    : 'text-slate-400 hover:text-white hover:bg-surface-elevated/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-cyan' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2 mt-2 border-t border-surface-border flex items-center justify-between">
            <span className="text-xs text-slate-400 font-sans">Appearance</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-xs text-slate-300 font-sans"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
