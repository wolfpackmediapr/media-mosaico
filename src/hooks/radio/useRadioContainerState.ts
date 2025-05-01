import { useState, useEffect } from "react";
import { useRadioFiles } from "@/hooks/radio/useRadioFiles";
import { useClearRadioState } from "@/hooks/radio/useClearRadioState";
import { useTranscriptionManagement } from "@/hooks/radio/useTranscriptionManagement";
import { useRadioPlayer } from "@/hooks/radio/useRadioPlayer";
import { useRadioActions } from "@/hooks/radio/useRadioActions"; // Import the new hook
import { toast } from "sonner";
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
  // Handlers (Combined from sub-hooks and actions hook)
  handleClearAll: () => void;
  handleTrackSelect: (index: number) => void;
  handleFilesAdded: (newFiles: File[]) => void; // This will be the enhanced one from useRadioActions
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
  // Removed local state for lastAction and playbackErrors

  const {
    files,
    setFiles,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    handleRemoveFile, // Keep original remove function if needed elsewhere, or pass to actions hook
    handleFilesAdded: handleFilesAddedOriginal // Pass original to actions hook
  } = useRadioFiles({
    persistKey,
    storage
  });

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

  const {
    clearAllState: clearAllStorageState, // Rename for clarity when passing to actions hook
    handleEditorRegisterReset,
    setClearAnalysis
  } = useClearRadioState({
    transcriptionId,
    persistKey,
    onTextChange
  });

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors, // Get directly from player hook
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange, // Get correctly typed handler
    handlePlaybackRateChange,
    handleSeekToSegment
    // Add resetPlaybackErrors if available and needed by useRadioActions
  } = useRadioPlayer({
    currentFile,
    isActiveMediaRoute,
    isMediaPlaying,
    setIsMediaPlaying,
    persistedText,
    transcriptionText,
    setTranscriptionText,
    onTextChange
  });

  // Use the new actions hook
  const {
    lastAction,
    handleClearAll,
    handleTrackSelect,
    handleFilesAdded // Get the enhanced version
  } = useRadioActions({
    files,
    currentFileIndex,
    setFiles,
    setCurrentFileIndex,
    handleFilesAddedOriginal,
    resetTranscription,
    setNewsSegments,
    clearAllStorageState
    // Pass resetPlaybackErrors if implemented and needed
  });


  // Removed useEffect for playbackErrors sync

  // Removed definitions for handleClearAll, handleTrackSelect, enhancedHandleFilesAdded

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
    volume,
    isMuted,
    playbackRate,
    playbackErrors,
    // State tracking
    lastAction, // From useRadioActions
    // Handlers
    handleClearAll, // From useRadioActions
    handleTrackSelect, // From useRadioActions
    handleFilesAdded, // From useRadioActions
    setFiles, // From useRadioFiles
    setCurrentFileIndex, // From useRadioFiles
    setIsProcessing, // From useTranscriptionManagement
    setProgress, // From useTranscriptionManagement
    setTranscriptionText, // From useTranscriptionManagement
    setTranscriptionId, // From useTranscriptionManagement
    handleTranscriptionReceived, // From useTranscriptionManagement
    handleTranscriptionTextChange, // From useTranscriptionManagement
    handleSegmentsReceived, // From useTranscriptionManagement
    handleMetadataChange, // From useTranscriptionManagement
    handleEditorRegisterReset, // From useClearRadioState
    setClearAnalysis, // From useClearRadioState
    handlePlayPause, // From useRadioPlayer
    handleSeek, // From useRadioPlayer
    handleSkip, // From useRadioPlayer
    handleToggleMute, // From useRadioPlayer
    handleVolumeChange, // From useRadioPlayer
    handlePlaybackRateChange, // From useRadioPlayer
    handleSeekToSegment, // From useRadioPlayer
    setNewsSegments, // From useTranscriptionManagement
    handleTranscriptionProcessingError // From useTranscriptionManagement
    // Note: handleRemoveFile from useRadioFiles is not currently exposed by useRadioContainerState
  };
};
