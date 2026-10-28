export type CanonicalSentiment = 'Positive' | 'Negative' | 'Neutral';
export type SentimentLabel = CanonicalSentiment | 'Uncertain';

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  model_state: string;
  results_status: 'results loaded' | 'results not generated';
  active_model: string;
  active_model_key: string;
  model_origin: string;
}

export interface LanguageInfo {
  language_code: string;
  language_name: string;
  script: string;
  confidence: number;
  status: 'supported' | 'limited' | 'unsupported';
  is_override?: boolean;
}

export interface ModelMetadata {
  key: string;
  name: string;
  origin: string;
  origin_label: string;
}

export interface OcclusionToken {
  token: string;
  score: number;
  raw_delta: number;
  impact: 'supports' | 'opposes' | 'neutral';
}

export interface OcclusionExplanation {
  method: string;
  tokens: OcclusionToken[];
  baseline_confidence: number;
}

export interface TextStatistics {
  word_count: number;
  char_count: number;
  sentence_count: number;
  reading_time_seconds: number;
  lexical_diversity: number;
  dominant_script: string;
}

export interface TranslationResult {
  text: string;
  source_lang: string;
  model: string;
  latency_ms: number;
  status: 'success' | 'same_language' | 'not_available' | 'model_error';
  message?: string;
}

export interface AnalyzeResult {
  text: string;
  sentiment: SentimentLabel;
  raw_sentiment?: string;
  is_uncertain?: boolean;
  uncertainty_notice?: string;
  confidence: number;
  probabilities: Record<SentimentLabel, number>;
  language: LanguageInfo;
  model: ModelMetadata;
  explanation?: OcclusionExplanation;
  translation?: TranslationResult;
  statistics: TextStatistics;
  latency_ms: number;
  disclaimer: string;
}

export interface BatchRecord {
  row_index: number;
  text: string;
  sentiment: SentimentLabel;
  confidence: number;
  probabilities: Record<SentimentLabel, number>;
  language: string;
  language_name: string;
}

export interface SkippedRow {
  row_index: number;
  reason: string;
}

export interface BatchResult {
  total_submitted: number;
  processed_count: number;
  skipped_count: number;
  skipped_rows: SkippedRow[];
  results: BatchRecord[];
  batch_latency_ms: number;
}

export interface ModelInfoResponse {
  active_model_key: string;
  model_name: string;
  model_type: string;
  model_origin: string;
  origin_label: string;
  available_models: string[];
  classes: string[];
  supported_languages: Record<string, {
    name: string;
    script: string;
    status: 'supported' | 'limited' | 'unsupported';
    min_test_samples: number;
  }>;
  device: string;
  max_sequence_length: number;
  version: string;
}

export interface AnalyticsResponse {
  status: string;
  dataset_statistics?: {
    records: {
      initial_collected: number;
      post_dedup: number;
      train_count: number;
      val_count: number;
      test_count: number;
    };
    distributions: {
      overall_labels: Record<string, number>;
      overall_languages: Record<string, number>;
      test_languages: Record<string, number>;
    };
    datasources: Array<{
      name: string;
      license: string;
      languages_used: string[];
      labels: string[];
    }>;
  };
  model_comparison?: Record<string, {
    key: string;
    name: string;
    type: string;
    origin: string;
    origin_label: string;
    overall: {
      accuracy: number;
      macro_f1: number;
      weighted_f1: number;
      precision_macro: number;
      recall_macro: number;
      latency_ms_per_sample: number;
      ece: number;
      selective_accuracy?: number;
      uncertainty_threshold?: number;
      samples_below_threshold?: number;
      percent_below_threshold?: number;
    };
    per_language: Record<string, {
      samples: number;
      accuracy: number;
      macro_f1: number;
    }>;
    confusion_matrix: {
      labels: string[];
      matrix: number[][];
    };
    calibration: {
      ece: number;
      bins: Array<{
        bin_index: number;
        range: [number, number];
        samples: number;
        accuracy: number;
        confidence: number;
        calibration_gap: number;
      }>;
    };
  }>;
  calibration?: {
    ece: number;
    bins: Array<{
      bin_index: number;
      range: [number, number];
      samples: number;
      accuracy: number;
      confidence: number;
      calibration_gap: number;
    }>;
  };
  error_analysis?: {
    total_errors_analyzed: number;
    samples: Array<{
      text: string;
      language: string;
      ground_truth: string;
      predicted: string;
      confidence: number;
      probabilities: Record<string, number>;
    }>;
  };
  translation_experiment?: {
    metadata: {
      experiment: string;
      eval_model: string;
      translator_family: string;
      subset_size_per_language: number;
      total_samples: number;
      languages_evaluated: string[];
      unsupported_languages: string[];
      seed: number;
      timestamp: string;
      status: string;
      full_test_status: string;
    };
    overall: {
      samples: number;
      original: { accuracy: number; macro_f1: number };
      translated: { accuracy: number; macro_f1: number };
      delta_accuracy: number;
      delta_macro_f1: number;
      mean_translation_latency_ms: number;
    };
    per_language: Record<string, {
      samples: number;
      original: { accuracy: number; macro_f1: number };
      translated: { accuracy: number; macro_f1: number };
      delta_accuracy: number;
      delta_macro_f1: number;
      mean_translation_latency_ms: number;
    }>;
  };
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  text: string;
  sentiment: SentimentLabel;
  confidence: number;
  language: string;
  language_name: string;
  probabilities: Record<SentimentLabel, number>;
}
