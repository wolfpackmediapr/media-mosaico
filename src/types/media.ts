// Shared media types used across radio and TV components

export interface UploadedFile extends File {
  preview?: string;
}

export interface NewsSegment {
  headline: string;
  text: string;
  start: number;
  end: number;
  keywords?: string[];
}

export interface TranscriptionMetadata {
  channel?: string;
  program?: string;
  category?: string;
  broadcastTime?: string;
  keywords?: string[];
}

export interface MediaFileProcessingState {
  isProcessing: boolean;
  progress: number;
}

export interface MediaPlayerState {
  isPlaying: boolean;
  volume: number[];
  currentTime?: number;
}

export interface MediaPlayerControls {
  onTogglePlayback: () => void;
  onVolumeChange: (value: number[]) => void;
  onSeekToTimestamp?: (timestamp: number) => void;
  onPlayPause?: () => void;
}

export interface ProcessingCallbacks {
  onProcess: (file: UploadedFile) => void;
  onTranscriptionComplete: (text: string) => void;
  onRemoveFile: (index: number) => void;
  onTranscriptionChange: (text: string) => void;
}

export interface SegmentCallbacks {
  onSegmentsReceived?: (segments: NewsSegment[]) => void;
  setNewsSegments: (segments: NewsSegment[]) => void;
  onSegmentsGenerated?: (segments: NewsSegment[]) => void;
}

export interface ContentState {
  transcriptionText: string;
  transcriptionId?: string;
  newsSegments: NewsSegment[];
  notepadContent: string;
  analysisResults?: string;
}