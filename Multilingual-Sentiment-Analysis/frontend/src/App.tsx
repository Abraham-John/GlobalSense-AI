import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CommandPalette } from './components/CommandPalette';
import { LandingPage } from './pages/LandingPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { BatchPage } from './pages/BatchPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { HistoryPage } from './pages/HistoryPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { DocsPage } from './pages/DocsPage';
import { api } from './services/api';
import { ModelInfoResponse, AnalyticsResponse, HistoryItem, HealthResponse } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'landing';
  });
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'unreachable' | 'loading'>('loading');
  const [modelInfo, setModelInfo] = useState<ModelInfoResponse | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchHealthAndMetadata = async () => {
    try {
      const health = await api.getHealth();
      setHealthData(health as HealthResponse);
      setBackendStatus('connected');
    } catch (err) {
      console.warn('Backend /api/health not reachable:', err);
      setBackendStatus('unreachable');
      setHealthData(null);
    }

    try {
      const info = await api.getModelInfo();
      setModelInfo(info);
    } catch (err) {
      console.warn('Backend /api/model-info not reachable yet:', err);
    }

    try {
      const analytics = await api.getAnalytics();
      setAnalyticsData(analytics);
    } catch (err) {
      console.warn('Backend /api/analytics not reachable yet:', err);
    }
  };

  // Fetch on mount and poll every 10 seconds
  useEffect(() => {
    fetchHealthAndMetadata();
    const interval = setInterval(fetchHealthAndMetadata, 10000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSwitchModel = async (modelKey: string) => {
    try {
      await api.switchModel(modelKey);
      await fetchHealthAndMetadata();
      showToast(`Inference model switched to ${modelKey}`);
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to switch model.');
    }
  };

  const handleSaveHistory = (item: HistoryItem) => {
    setHistory((prev) => [item, ...prev]);
  };

  const handleClearHistory = () => {
    setHistory([]);
    showToast('Session prediction history cleared.');
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col overflow-x-hidden w-full ${isDarkMode ? 'dark bg-ink-950 text-slate-100' : 'light bg-slate-50 text-slate-900'} transition-colors duration-200`}>
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        modelInfo={modelInfo}
        healthData={healthData}
        backendStatus={backendStatus}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onSwitchModel={handleSwitchModel}
      />

      {/* Main Page Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'landing' && (
          <LandingPage
            onNavigate={setActiveTab}
            modelInfo={modelInfo}
            analyticsData={analyticsData}
          />
        )}
        {activeTab === 'analyze' && (
          <AnalyzePage
            modelInfo={modelInfo}
            onSaveHistory={handleSaveHistory}
            activeModelKey={healthData?.active_model_key || 'pretrained_xlmr'}
            onSwitchModel={handleSwitchModel}
          />
        )}
        {activeTab === 'batch' && <BatchPage />}
        {activeTab === 'analytics' && (
          <AnalyticsPage
            analyticsData={analyticsData}
            historyCount={history.length}
          />
        )}
        {activeTab === 'history' && (
          <HistoryPage
            history={history}
            onClearHistory={handleClearHistory}
            onSelectForAnalysis={(text) => {
              setActiveTab('analyze');
            }}
          />
        )}
        {activeTab === 'methodology' && <MethodologyPage />}
        {activeTab === 'docs' && <DocsPage />}
      </main>

      {/* Footer */}
      <Footer />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setActiveTab}
        onSwitchModel={handleSwitchModel}
        onClearHistory={handleClearHistory}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-surface-elevated border border-surface-border shadow-2xl text-xs font-mono text-white flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
