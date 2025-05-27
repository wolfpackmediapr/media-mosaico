import { useState, useEffect } from "react";
import { useRadioFiles } from "@/hooks/radio/useRadioFiles";
import { useClearRadioState } from "@/hooks/radio/useClearRadioState";
import { useTranscriptionManagement } from "@/hooks/radio/useTranscriptionManagement";
import { useRadioActions } from "@/hooks/radio/useRadioActions";
import { useAudioPlaybackManager } from "@/hooks/radio/useAudioPlaybackManager";
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
  handleClearAll: () => void;
  handleTrackSelect: (index: number) => void;
  handleFilesAdded: (newFiles: File[]) => void;
  setFiles: (files: UploadedFile[]) => void;
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
  switchToNativeAudio: () => void;
  switchToHowler: () => void; 
  validateCurrentFileUrl: () => Promise<boolean>;
  resetTranscription: () => void;
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
  const {
    files,
    setFiles,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    handleFilesAdded: handleFilesAddedOriginal,
    validateCurrentFileUrl
  } = useRadioFiles({
    persistKey,
    storage
  });

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

  // State clearing logic
  const {
    clearAllState: clearAllStorageState,
    handleEditorRegisterReset,
    setClearAnalysis
  } = useClearRadioState({
    transcriptionId,
    persistKey,
    onTextChange
  });

  // Audio playback management
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    seekToSegment: handleSeekToSegment,
    switchToNativeAudio,
    switchToHowler
  } = useAudioPlaybackManager({
    currentFile,
    isActiveMediaRoute,
    isMediaPlaying,
    setIsMediaPlaying,
    persistedText,
    transcriptionText,
    setTranscriptionText,
    onTextChange
  });

  // Radio actions
  const {
    lastAction,
    // Here we need to update this function to return void instead of boolean
    handleClearAll: originalHandleClearAll,
    handleTrackSelect,
    handleFilesAdded
  } = useRadioActions({
    files,
    currentFileIndex,
    setFiles,
    setCurrentFileIndex,
    handleFilesAddedOriginal,
    resetTranscription,
    setNewsSegments,
    clearAllStorageState
  });

  // Create wrapper functions to handle type mismatches between components
  const handleVolumeChangeWrapper = (value: number[]) => {
    handleVolumeChange(value);
  };

  const handlePlaybackRateChangeWrapper = () => {
    const rates = [0.5, 1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    handlePlaybackRateChange(rates[nextIndex]);
  };

  // Create a wrapper for handleClearAll that conforms to the expected type
  const handleClearAllWrapper = async (): Promise<void> => {
    await originalHandleClearAll();
  };

  // Add effect to handle clearing all state
  useEffect(() => {
    if (lastAction === 'clear') {
      // Ensure transcription text is cleared
      if (transcriptionText) {
        console.log('[useRadioContainerState] Clearing transcription text after clear action');
        setTranscriptionText('');
        
        // If there's a callback for text changes, call it
        if (onTextChange) {
          onTextChange('');
        }
      }
      
      // Ensure news segments are cleared
      if (newsSegments.length > 0) {
        console.log('[useRadioContainerState] Clearing news segments after clear action');
        setNewsSegments([]);
      }
    }
  }, [lastAction, transcriptionText, setTranscriptionText, onTextChange, newsSegments, setNewsSegments]);

  // Ensure volume is always in array format for components that expect it
  const volumeArray = Array.isArray(volume) ? volume : [volume * 100];

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
    // Player
    isPlaying,
    currentTime,
    duration,
    volume: volumeArray,
    isMuted,
    playbackRate,
    playbackErrors,
    // State tracking
    lastAction,
    // Handlers
    handleClearAll: handleClearAllWrapper, // Use our wrapped version that returns void
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
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange: handleVolumeChangeWrapper,
    handlePlaybackRateChangeWrapper,
    handleSeekToSegment,
    setNewsSegments,
    handleTranscriptionProcessingError,
    // Add the missing properties to the return object
    switchToNativeAudio,
    switchToHowler,
    validateCurrentFileUrl,
    resetTranscription
  };
};
