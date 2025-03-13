
export interface PressClipping {
  id: string;
  title: string;
  content: string;
  category: string;
  page_number: number;
  summary_who?: string;
  summary_what?: string;
  summary_when?: string;
  summary_where?: string;
  summary_why?: string;
  keywords?: string[];
  client_relevance?: string[];
}

export interface ProcessingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  publication_name: string;
}
