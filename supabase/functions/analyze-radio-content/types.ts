
export interface Client {
  name: string;
  keywords: string[];
}

export interface TranscriptMetadata {
  sentences?: any[];
  utterances?: any[];
  transcript_id?: string;
}

export interface AnalysisRequest {
  transcriptionText: string;
  transcriptId?: string;
  categories?: string[];
  clients?: Client[];
}
