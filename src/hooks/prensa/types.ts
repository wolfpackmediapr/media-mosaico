export interface PressClipping {
  id: string;
  title: string;
  content: string;
  category: string;
  page_number: number;
  keywords?: string[];
  client_relevance?: string[];
}

export interface DocumentMetadata {
  summary: string;
  categories: string[];
  keywords: string[];
  relevantClients: string[];
  totalClippings: number;
}

export interface ProcessingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  publication_name: string;
  document_summary?: string;
  document_metadata?: DocumentMetadata;
}

export interface SearchResult extends PressClipping {
  similarity: number;
  publication_name: string;
  citations?: any;
}

export interface JobStatusResponse {
  job: ProcessingJob;
  clippings?: PressClipping[];
}
