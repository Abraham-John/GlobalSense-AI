import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Layers,
  Download,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { api } from '../services/api';
import { BatchResult, SentimentLabel } from '../types';

export const BatchPage: React.FC = () => {
  const [inputMode, setInputMode] = useState<'csv' | 'paste'>('paste');
  const [pastedLines, setPastedLines] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textColumn, setTextColumn] = useState('text');
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [sentimentFilter, setSentimentFilter] = useState<string>('ALL');
  const [languageFilter, setLanguageFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const handleProcessPasted = async () => {
    const lines = pastedLines
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setError('Please paste at least one text line to analyze.');
      return;
    }
    setError(null);
    setIsProcessing(true);

    try {
      const data = await api.analyzeBatch(lines, 500);
      setBatchResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Batch analysis failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessCsv = async () => {
    if (!selectedFile) {
      setError('Please select a CSV file to upload.');
      return;
    }
    setError(null);
    setIsProcessing(true);

    try {
      const data = await api.uploadCsv(selectedFile, textColumn, 500);
      setBatchResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'CSV upload analysis failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCsv = () => {
    if (!batchResult || batchResult.results.length === 0) return;

    const headers = ['Row', 'Text', 'Language', 'Sentiment', 'Confidence', 'Positive_Prob', 'Negative_Prob', 'Neutral_Prob'];
    const rows = batchResult.results.map((r) => [
      r.row_index,
      `"${r.text.replace(/"/g, '""')}"`,
      r.language,
      r.sentiment,
      r.confidence,
      r.probabilities.Positive,
      r.probabilities.Negative,
      r.probabilities.Neutral,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `globalsense_batch_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered results
  const filteredResults = batchResult?.results.filter((item) => {
    const matchesSentiment = sentimentFilter === 'ALL' || item.sentiment === sentimentFilter;
    const matchesLanguage = languageFilter === 'ALL' || item.language === languageFilter;
    const matchesQuery = !searchQuery || item.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSentiment && matchesLanguage && matchesQuery;
  });

  // Sentiment distribution for chart
  const sentimentCounts: Record<string, number> = { Positive: 0, Negative: 0, Neutral: 0, Uncertain: 0 };
  const languageCounts: Record<string, number> = {};

  if (batchResult) {
    for (const r of batchResult.results) {
      sentimentCounts[r.sentiment] = (sentimentCounts[r.sentiment] || 0) + 1;
      languageCounts[r.language] = (languageCounts[r.language] || 0) + 1;
    }
  }

  const sentimentChartData = [
    { name: 'Positive', count: sentimentCounts.Positive || 0, color: '#10b981' },
    { name: 'Negative', count: sentimentCounts.Negative || 0, color: '#f43f5e' },
    { name: 'Neutral', count: sentimentCounts.Neutral || 0, color: '#64748b' },
    { name: 'Uncertain', count: sentimentCounts.Uncertain || 0, color: '#f59e0b' },
  ];

  const languageChartData = Object.entries(languageCounts).map(([lang, count]) => ({
    language: lang,
    count,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
          Batch Sentiment Pipeline
        </h1>
        <p className="text-sm text-slate-400">
          Process multiple reviews simultaneously via direct text pasting or CSV upload. Includes aggregate analytics and skipped-row reporting.
        </p>
      </div>

      {/* Input Mode Selector */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-4">
        <button
          onClick={() => setInputMode('paste')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
            inputMode === 'paste'
              ? 'bg-surface-elevated text-white border border-surface-border'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 text-brand-cyan" />
          <span>Paste Text Lines</span>
        </button>
        <button
          onClick={() => setInputMode('csv')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
            inputMode === 'csv'
              ? 'bg-surface-elevated text-white border border-surface-border'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-brand-indigo" />
          <span>Upload CSV File</span>
        </button>
      </div>

      {/* Input Card */}
      <div className="rounded-2xl bg-surface-elevated border border-surface-border p-6 shadow-xl space-y-4">
        {inputMode === 'paste' ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400">
              <span>Enter one review or sentence per line (max 500 rows)</span>
              <span>{pastedLines.split('\n').filter((l) => l.trim()).length} lines detected</span>
            </div>
            <textarea
              value={pastedLines}
              onChange={(e) => setPastedLines(e.target.value)}
              placeholder="This movie was incredible!&#10;यह सेवा बहुत ही बेकार थी।&#10;ye movie bohot acchi thi yaar&#10;Ce restaurant était fantastique."
              rows={6}
              className="w-full bg-ink-950/60 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 border border-surface-border focus:border-brand-violet focus:ring-1 focus:ring-brand-violet focus:outline-none transition-all font-sans"
            />
            <div className="flex justify-end">
              <button
                onClick={handleProcessPasted}
                disabled={isProcessing || !pastedLines.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan hover:opacity-95 text-white font-medium text-xs font-mono shadow-lg shadow-brand-glow transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Batch...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Analyze Pasted Lines</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-surface-border hover:border-brand-violet/40 rounded-xl p-6 text-center cursor-pointer transition-all bg-ink-950/40">
              <input
                type="file"
                accept=".csv"
                id="csv-file-input"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
              <label htmlFor="csv-file-input" className="cursor-pointer space-y-2 block">
                <Upload className="w-8 h-8 text-brand-cyan mx-auto" />
                <div className="text-sm font-semibold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Click to select or drag and drop CSV file'}
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  UTF-8 encoded CSV, max 10MB, up to 500 rows processed per request.
                </p>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-mono text-slate-400">Target Text Column:</label>
                <input
                  type="text"
                  value={textColumn}
                  onChange={(e) => setTextColumn(e.target.value)}
                  placeholder="text or review"
                  className="bg-ink-950 text-slate-200 border border-surface-border rounded-lg px-2.5 py-1 text-xs font-mono w-36 focus:outline-none focus:border-brand-violet"
                />
              </div>

              <button
                onClick={handleProcessCsv}
                disabled={isProcessing || !selectedFile}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-cyan hover:opacity-95 text-white font-medium text-xs font-mono shadow-lg shadow-brand-glow transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing CSV...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Upload & Process CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-sentiment-neg/10 border border-sentiment-neg/30 text-sentiment-neg text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Batch Results & Visualizations */}
      {batchResult && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-surface-elevated border border-surface-border">
              <span className="text-xs font-mono text-slate-400">Total Submitted</span>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {batchResult.total_submitted}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-surface-elevated border border-surface-border">
              <span className="text-xs font-mono text-slate-400">Successfully Processed</span>
              <div className="text-2xl font-bold font-mono text-sentiment-pos mt-1">
                {batchResult.processed_count}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-surface-elevated border border-surface-border">
              <span className="text-xs font-mono text-slate-400">Skipped Records</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {batchResult.skipped_count}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-surface-elevated border border-surface-border">
              <span className="text-xs font-mono text-slate-400">Batch Processing Time</span>
              <div className="text-2xl font-bold font-mono text-brand-cyan mt-1">
                {batchResult.batch_latency_ms.toFixed(0)} ms
              </div>
            </div>
          </div>

          {/* Aggregate Visualizations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sentiment Breakdown Chart */}
            <div className="p-5 rounded-2xl bg-surface-elevated border border-surface-border space-y-3">
              <h3 className="text-sm font-display font-semibold text-white">
                Sentiment Distribution
              </h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentChartData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={45}
                      paddingAngle={4}
                    >
                      {sentimentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171722',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 text-xs font-mono text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sentiment-pos" />
                  Positive: {sentimentCounts.Positive}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sentiment-neg" />
                  Negative: {sentimentCounts.Negative}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sentiment-neu" />
                  Neutral: {sentimentCounts.Neutral}
                </span>
              </div>
            </div>

            {/* Language Breakdown Chart */}
            <div className="p-5 rounded-2xl bg-surface-elevated border border-surface-border space-y-3">
              <h3 className="text-sm font-display font-semibold text-white">
                Language Frequency
              </h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={languageChartData}>
                    <XAxis dataKey="language" stroke="#64748b" fontSize={11} fontFamily="monospace" />
                    <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171722',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Skipped Rows Report (Never Drop Silently) */}
          {batchResult.skipped_rows.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2 text-xs font-mono">
              <div className="flex items-center gap-2 font-bold uppercase">
                <AlertTriangle className="w-4 h-4" />
                <span>Skipped Rows Report ({batchResult.skipped_rows.length} rows excluded)</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {batchResult.skipped_rows.map((skip, i) => (
                  <li key={i}>
                    Row #{skip.row_index >= 0 ? skip.row_index + 1 : 'N/A'}: {skip.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Filter Bar & Export */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface-elevated border border-surface-border">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Filter className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Sentiment:</span>
                <select
                  value={sentimentFilter}
                  onChange={(e) => setSentimentFilter(e.target.value)}
                  className="bg-ink-950 text-slate-200 border border-surface-border rounded-lg px-2 py-1 text-xs font-mono focus:outline-none"
                >
                  <option value="ALL">All Sentiments</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                  <option value="Neutral">Neutral</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <span>Language:</span>
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="bg-ink-950 text-slate-200 border border-surface-border rounded-lg px-2 py-1 text-xs font-mono focus:outline-none"
                >
                  <option value="ALL">All Languages</option>
                  {Object.keys(languageCounts).map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-ink-950 text-slate-200 border border-surface-border rounded-lg px-2 py-1 text-xs font-mono w-28 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-surface hover:bg-surface-elevated border border-surface-border text-xs font-mono text-slate-200 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Results Table */}
          <div className="rounded-xl border border-surface-border overflow-hidden bg-surface-elevated">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-surface-border bg-ink-950/80 text-slate-400">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Review Text</th>
                    <th className="p-3 w-28">Language</th>
                    <th className="p-3 w-28">Sentiment</th>
                    <th className="p-3 w-24">Confidence</th>
                    <th className="p-3 w-36">Probabilities</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filteredResults && filteredResults.length > 0 ? (
                    filteredResults.map((r, i) => (
                      <tr key={i} className="hover:bg-surface/50 transition-colors">
                        <td className="p-3 text-center text-slate-500 font-mono">
                          {r.row_index + 1}
                        </td>
                        <td className="p-3 text-slate-200 max-w-md truncate font-sans">
                          {r.text}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-ink-950 border border-surface-border text-slate-300 font-mono text-[10px] uppercase">
                            {r.language}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                              r.sentiment === 'Positive'
                                ? 'bg-sentiment-pos/15 text-sentiment-pos'
                                : r.sentiment === 'Negative'
                                ? 'bg-sentiment-neg/15 text-sentiment-neg'
                                : 'bg-slate-700/30 text-slate-300'
                            }`}
                          >
                            {r.sentiment}
                          </span>
                        </td>
                        <td className="p-3 text-slate-200 font-mono">
                          {(r.confidence * 100).toFixed(1)}%
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-400 space-y-0.5">
                          <div className="flex justify-between">
                            <span className="text-sentiment-pos">P:</span>
                            <span>{(r.probabilities.Positive * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sentiment-neg">N:</span>
                            <span>{(r.probabilities.Negative * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500 font-mono">
                        No rows match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
