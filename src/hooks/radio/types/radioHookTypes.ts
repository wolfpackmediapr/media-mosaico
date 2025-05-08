
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";
import { UploadedFile } from "@/components/radio/types";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

export interface RadioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number[];
  isMuted: boolean;
  playbackRate: number;
  playbackErrors: string | null;
  handlePlayPause: () => void;
  handleSeek: (time: number) => void;
  handleSkip: (direction: 'forward' | 'backward') => void;
  handleToggleMute: () => void;
  handleVolumeChange: (value: number[]) => void;
  handlePlaybackRateChange: (rate: number) => void;
  handleSeekToSegment: (segmentOrTime: RadioNewsSegment | number) => void;
}

export interface RadioTranscriptionState {
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  metadata?: { 
    emisora?: string; 
    programa?: string; 
    horario?: string; 
    categoria?: string; 
    station_id?: string; 
    program_id?: string; 
  };
  newsSegments: RadioNewsSegment[];
}

export interface RadioFilesState {
  files: UploadedFile[];
  currentFile: UploadedFile | null;
  currentFileIndex: number;
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  setCurrentFileIndex: (index: number) => void;
}

export interface RadioProcessingState {
  isProcessing: boolean;
  progress: number;
  setIsProcessing: (isProcessing: boolean) => void;
  setProgress: React.Dispatch<React.SetStateAction<number>>;
}

export interface RadioContainerState extends 
  RadioFilesState,
  RadioProcessingState,
  RadioTranscriptionState,
  RadioPlayerState {
  // Additional properties
  lastAction: string | null;
  handleClearAll: () => Promise<void>;
  handleTrackSelect: (index: number) => void;
  handleFilesAdded: (newFiles: File[]) => void;
  handleTranscriptionReceived: (result: TranscriptionResult) => void;
  handleTranscriptionTextChange: (text: string) => void;
  handleSegmentsReceived: (segments: RadioNewsSegment[]) => void;
  handleMetadataChange: (metadata: { 
    emisora: string; 
    programa: string; 
    horario: string; 
    categoria: string; 
    station_id: string; 
    program_id: string; 
  }) => void;
  handleEditorRegisterReset: (resetFn: () => void) => void;
  setClearAnalysis: (fn: () => void) => void;
  setTranscriptionText: (text: string) => void;
  setTranscriptionId: (id?: string) => void;
  setNewsSegments: React.Dispatch<React.SetStateAction<RadioNewsSegment[]>>;
  handleTranscriptionProcessingError: (error: any) => void;
}
