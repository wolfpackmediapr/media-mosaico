
import { useState } from "react";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { useRadioFiles } from "@/hooks/radio/useRadioFiles";
import { useClearRadioState } from "@/hooks/radio/useClearRadioState";
import { useTranscriptionManagement } from "@/hooks/radio/useTranscriptionManagement";
import { useRadioPlayer } from "@/hooks/radio/useRadioPlayer";
import { toast } from "sonner";

interface UseRadioContainerStateProps {
  persistedText?: string;
  onTextChange?: (text: string) => void;
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
  isActiveMediaRoute?: boolean;
  isMediaPlaying?: boolean;
  setIsMediaPlaying?: (isPlaying: boolean) => void;
}

export const useRadioContainerState = ({
  persistedText = "",
  onTextChange,
  persistKey = "radio-files",
  storage = "sessionStorage",
  isActiveMediaRoute = true,
  isMediaPlaying = false,
  setIsMediaPlaying = () => {}
}: UseRadioContainerStateProps) => {
  const { isAuthenticated } = useAuthStatus();
  const [lastAction, setLastAction] = useState<string | null>(null);

  const {
    files,
    setFiles,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    handleRemoveFile,
    handleFilesAdded
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
    clearAllState, 
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
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment
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

  const handleClearAll = () => {
    console.log('[RadioContainer] handleClearAll: Starting clear sequence');
    resetTranscription();
    setNewsSegments([]);
    setFiles([]);
    setCurrentFileIndex(0);
    clearAllState();
    toast.success('Todos los datos han sido borrados');
    setLastAction('clear');
  };

  const handleTrackSelect = (index: number) => {
    if (index !== currentFileIndex) {
      setCurrentFileIndex(index);
      setLastAction('track-select');
    }
  };

  // Fixed function to properly handle the return type
  const enhancedHandleFilesAdded = (newFiles: File[]) => {
    // Call the original function
    const result = handleFilesAdded(newFiles);
    
    // If files were added, show success toast
    if (newFiles.length > 0) {
      toast.success(`${newFiles.length} archivos añadidos correctamente`);
      setLastAction('files-added');
    }
    
    // Return the result of the original function
    return result;
  };

  return {
    // Auth
    isAuthenticated,
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
    // State tracking
    lastAction,
    // Handlers
    handleClearAll,
    handleTrackSelect,
    handleFilesAdded: enhancedHandleFilesAdded,
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
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment,
    setNewsSegments,
    handleTranscriptionProcessingError
  };
};
