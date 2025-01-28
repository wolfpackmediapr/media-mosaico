export interface TranscriptionAnalysis {
  summary?: string;
  content_safety_labels?: {
    status: string;
    results: ContentSafetyResult[];
    summary: Record<string, number>;
    severity_score_summary: Record<string, SeverityScores>;
  };
  sentiment_analysis_results?: SentimentResult[];
  entities?: EntityResult[];
  iab_categories_result?: {
    status: string;
    results: TopicResult[];
    summary: Record<string, number>;
  };
  chapters?: ChapterResult[];
  auto_highlights_result?: {
    status: string;
    results: KeyPhraseResult[];
  };
  speakers?: Array<{
    speaker: string;
    confidence: number;
    start: number;
    end: number;
  }>;
  redacted_audio_url?: string;
}

interface ContentSafetyResult {
  text: string;
  labels: {
    label: string;
    confidence: number;
    severity: number;
  }[];
  timestamp: TimeRange;
}

interface SeverityScores {
  low: number;
  medium: number;
  high: number;
}

interface SentimentResult {
  text: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  confidence: number;
  speaker?: string;
  start: number;
  end: number;
}

interface EntityResult {
  text: string;
  entity_type: string;
  start: number;
  end: number;
}

interface TopicResult {
  text: string;
  labels: {
    label: string;
    relevance: number;
  }[];
  timestamp: TimeRange;
}

interface ChapterResult {
  gist: string;
  headline: string;
  summary: string;
  start: number;
  end: number;
}

interface KeyPhraseResult {
  text: string;
  count: number;
  rank: number;
  timestamps: TimeRange[];
}

interface TimeRange {
  start: number;
  end: number;
}