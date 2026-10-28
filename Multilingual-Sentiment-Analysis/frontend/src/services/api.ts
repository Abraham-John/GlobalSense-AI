import axios from 'axios';
import {
  AnalyzeResult,
  BatchResult,
  ModelInfoResponse,
  AnalyticsResponse,
} from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth(): Promise<{ status: string; service: string; version: string; active_model: string }> {
    const res = await axios.get(`${API_BASE}/health`);
    return res.data;
  },

  async getModelInfo(): Promise<ModelInfoResponse> {
    const res = await axios.get<ModelInfoResponse>(`${API_BASE}/model-info`);
    return res.data;
  },

  async switchModel(modelKey: string): Promise<{ status: string; active_model: ModelInfoResponse }> {
    const res = await axios.post(`${API_BASE}/model/switch`, { model_key: modelKey });
    return res.data;
  },

  async analyzeText(
    text: string,
    languageOverride?: string,
    explain: boolean = true,
    translate: boolean = false
  ): Promise<AnalyzeResult> {
    const res = await axios.post<AnalyzeResult>(`${API_BASE}/analyze`, {
      text,
      language_override: languageOverride || null,
      explain,
      translate,
    });
    return res.data;
  },

  async analyzeBatch(texts: string[], maxRows: number = 500): Promise<BatchResult> {
    const res = await axios.post<BatchResult>(`${API_BASE}/analyze/batch`, {
      texts,
      max_rows: maxRows,
    });
    return res.data;
  },

  async uploadCsv(file: File, textColumn: string = 'text', maxRows: number = 500): Promise<BatchResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post<BatchResult>(
      `${API_BASE}/analyze/upload-csv?text_column=${encodeURIComponent(textColumn)}&max_rows=${maxRows}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data;
  },

  async getAnalytics(): Promise<AnalyticsResponse> {
    const res = await axios.get<AnalyticsResponse>(`${API_BASE}/analytics`);
    return res.data;
  },
};
