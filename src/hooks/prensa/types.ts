export interface PressClipping {
  id: string;
  title: string;
  content: string;
  category: string;
  page_number: number;
  keywords?: string[];
  client_relevance?: string[];
}

export interface ProcessingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  publication_name: string;
  document_summary?: string;
}

export interface SearchResult extends PressClipping {
  similarity: number;
  publication_name: string;
}

export interface JobStatusResponse {
  job: ProcessingJob;
  clippings?: PressClipping[];
}
