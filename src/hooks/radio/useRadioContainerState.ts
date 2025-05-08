import { useState, useEffect } from "react";
import { useRadioFiles } from "@/hooks/radio/useRadioFiles";
import { useClearRadioState } from "@/hooks/radio/useClearRadioState";
import { useTranscriptionManagement } from "@/hooks/radio/useTranscriptionManagement";
import { useRadioActions } from "@/hooks/radio/useRadioActions";
import { useRadioPlayerState } from "@/hooks/radio/useRadioPlayerState";
import { UploadedFile } from "@/components/radio/types";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";

interface UseRadioContainerStateProps {
  persistedText?: string;
  onTextChange?: (text: string) => void;
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
  isActiveMediaRoute?: boolean;
  isMediaPlaying?: boolean;
  setIsMediaPlaying?: (isPlaying: boolean) => void;
}

// Define the explicit return type for the hook
interface RadioContainerState {
  // Files
  files: UploadedFile[];
  currentFile: UploadedFile | null;
  currentFileIndex: number;
  // Processing
  isProcessing: boolean;
  progress: number;
  // Transcription
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  metadata?: { emisora?: string; programa?: string; horario?: string; categoria?: string; station_id?: string; program_id?: string; };
  newsSegments: RadioNewsSegment[];
  // Player
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number[];
  isMuted: boolean;
  playbackRate: number;
  playbackErrors: string | null;
  // State tracking
  lastAction: string | null;
  // Handlers
  handleClearAll: () => Promise<void>;
  handleTrackSelect: (index: number) => void;
  handleFilesAdded: (newFiles: File[]) => void;
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  setCurrentFileIndex: (index: number) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setProgress: React.Dispatch<React.SetStateAction<number>>;
  setTranscriptionText: (text: string) => void;
  setTranscriptionId: (id?: string) => void;
  handleTranscriptionReceived: (result: TranscriptionResult) => void;
  handleTranscriptionTextChange: (text: string) => void;
  handleSegmentsReceived: (segments: RadioNewsSegment[]) => void;
  handleMetadataChange: (metadata: { emisora: string; programa: string; horario: string; categoria: string; station_id: string; program_id: string; }) => void;
  handleEditorRegisterReset: (resetFn: () => void) => void;
  setClearAnalysis: (fn: () => void) => void;
  handlePlayPause: () => void;
  handleSeek: (time: number) => void;
  handleSkip: (direction: 'forward' | 'backward') => void;
  handleToggleMute: () => void;
  handleVolumeChange: (value: number[]) => void;
  handlePlaybackRateChange: (rate: number) => void;
  handleSeekToSegment: (segmentOrTime: RadioNewsSegment | number) => void;
  setNewsSegments: React.Dispatch<React.SetStateAction<RadioNewsSegment[]>>;
  handleTranscriptionProcessingError: (error: any) => void;
}

export const useRadioContainerState = ({
  persistedText = "",
  onTextChange,
  persistKey = "radio-files",
  storage = "sessionStorage",
  isActiveMediaRoute = true,
  isMediaPlaying = false,
  setIsMediaPlaying = () => {}
}: UseRadioContainerStateProps): RadioContainerState => {
  // Files state management
  const radioFiles = useRadioFiles({
    persistKey,
    storage
  });

  // Destructure radioFiles props
  const {
    files,
    currentFile,
    currentFileIndex,
    setCurrentFileIndex,
    addFiles,
    removeFile,
    isRestoringFiles
  } = radioFiles;

  // Function to set files correctly
  const setFiles = (filesOrFn: React.SetStateAction<UploadedFile[]>) => {
    if (typeof filesOrFn === 'function') {
      // Create a new array with the function result
      const newFiles = filesOrFn(files);
      
      // Clear existing files
      while (files.length > 0) {
        removeFile(0);
      }
      
      // Add new files
      if (Array.isArray(newFiles) && newFiles.length > 0) {
        addFiles(newFiles as File[]);
      }
    } else if (Array.isArray(filesOrFn)) {
      // Clear existing files
      while (files.length > 0) {
        removeFile(0);
      }
      
      // Add new files
      if (filesOrFn.length > 0) {
        addFiles(filesOrFn as File[]);
      }
    }
  };

  // Transcription state management
  const {
    isProcessing,
    setIsProcessing,
    progress,
    setProgress,
    transcriptionText,
    setTranscriptionText,
    transcriptionId,
    setTranscriptionId,
    transcriptionResult,
    metadata,
    newsSegments,
    setNewsSegments,
    handleTranscriptionTextChange,
    handleSegmentsReceived,
    handleMetadataChange,
    handleTranscriptionReceived,
    resetTranscription,
    handleTranscriptionProcessingError
  } = useTranscriptionManagement();

  // State clearing logic - type signature updated to Promise<void>
  const {
    clearAllState: clearAllStorageState,
    handleEditorRegisterReset,
    setClearAnalysis
  } = useClearRadioState({
    transcriptionId,
    persistKey,
    onTextChange
  });

  // Use our newly extracted player state hook
  const playerState = useRadioPlayerState({
    currentFile,
    isActiveMediaRoute,
    isMediaPlaying,
    setIsMediaPlaying,
    persistedText,
    transcriptionText,
    setTranscriptionText,
    onTextChange
  });

  // Define the handler for adding files before using it in radioActions
  const handleFilesAddedOriginal = (newFiles: File[]) => {
    addFiles(newFiles);
  };
  
  // Radio actions - with all required props
  const radioActions = useRadioActions({
    files,
    currentFileIndex,
    setFiles,
    setCurrentFileIndex,
    handleFilesAddedOriginal,
    resetTranscription,
    setNewsSegments,
    clearAllStorageState
  });
  
  // Extract properties from radioActions
  const {
    lastAction,
    handleClearAll,
    handleTrackSelect,
    handleFilesAdded
  } = radioActions;

  // Return the complete state and handlers
  return {
    // Files
    files,
    currentFile,
    currentFileIndex,
    // Processing
    isProcessing,
    progress,
    // Transcription
    transcriptionText,
    transcriptionId,
    transcriptionResult,
    metadata,
    newsSegments,
    // Player state from our new hook
    ...playerState,
    // State tracking
    lastAction,
    // Handlers
    handleClearAll,
    handleTrackSelect,
    handleFilesAdded,
    setFiles,
    setCurrentFileIndex,
    setIsProcessing,
    setProgress,
    setTranscriptionText,
    setTranscriptionId,
    handleTranscriptionReceived,
    handleTranscriptionTextChange,
    handleSegmentsReceived,
    handleMetadataChange,
    handleEditorRegisterReset,
    setClearAnalysis,
    setNewsSegments,
    handleTranscriptionProcessingError
  };
};
