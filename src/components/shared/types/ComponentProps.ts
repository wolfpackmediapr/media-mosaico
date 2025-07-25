// Shared component prop interfaces to avoid duplication

import { ReactNode } from 'react';
import { NewsSegment, UploadedFile, TranscriptionMetadata } from '@/types/media';

export interface BaseLayoutProps {
  isAuthenticated: boolean | null;
  topSection: ReactNode;
  leftSection: ReactNode;
  rightSection: ReactNode;
  transcriptionSection: ReactNode;
  analysisSection: ReactNode;
  newsSegmentsSection: ReactNode;
  notepadSection: ReactNode;
  typeformSection?: ReactNode;
}

export interface BaseAnalysisProps {
  transcriptionText?: string;
  transcriptionId?: string;
  transcriptionResult?: any;
  onSegmentsGenerated?: (segments: NewsSegment[]) => void;
  onClearAnalysis?: () => void;
  forceReset?: boolean;
  analysisResults?: string;
}

export interface BaseReportButtonProps {
  segments?: NewsSegment[];
  transcriptionText: string;
  transcriptionId?: string;
  metadata?: TranscriptionMetadata;
  disabled?: boolean;
}

export interface BaseTranscriptionEditorProps {
  transcriptionText: string;
  isProcessing: boolean;
  onTranscriptionChange: (text: string) => void;
  onRegisterReset?: (resetFn: () => void) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

export interface BaseUploadContainerProps {
  uploadedFiles: UploadedFile[];
  setUploadedFiles: (files: UploadedFile[]) => void;
  onProcess: (file: UploadedFile) => void;
  onRemoveFile: (index: number) => void;
  isProcessing: boolean;
  progress: number;
}

export interface BaseVideoControlsProps {
  isPlaying: boolean;
  volume: number[];
  onTogglePlayback: () => void;
  onVolumeChange: (value: number[]) => void;
  currentTime?: number;
  duration?: number;
  onSeek?: (time: number) => void;
}