
import { useState, useEffect } from "react";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { usePersistentAudioFiles } from "@/hooks/radio/usePersistentAudioFiles";
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
  const [playbackErrors, setPlaybackErrors] = useState<string | null>(null);

  const {
    files,
    setFiles,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    isUploading,
    handleFilesAdded: handleFileAdded,
    handleRemoveFile
  } = usePersistentAudioFiles({
    persistKey,
    storage,
    autoUpload: true
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
    playbackErrors: audioPlaybackErrors,
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

  // Sync audio errors with component state
  useEffect(() => {
    if (audioPlaybackErrors !== playbackErrors) {
      setPlaybackErrors(audioPlaybackErrors);
    }
  }, [audioPlaybackErrors]);

  const handleClearAll = () => {
    console.log('[RadioContainer] handleClearAll: Starting clear sequence');
    resetTranscription();
    setNewsSegments([]);
    setFiles([]);
    setCurrentFileIndex(0);
    clearAllState();
    setPlaybackErrors(null);
    toast.success('Todos los datos han sido borrados');
    setLastAction('clear');
  };

  const handleTrackSelect = (index: number) => {
    if (index !== currentFileIndex) {
      setCurrentFileIndex(index);
      setPlaybackErrors(null); // Reset errors when changing tracks
      setLastAction('track-select');
    }
  };

  // Fixed function to properly handle the return type
  const handleFilesAdded = (newFiles: File[]) => {
    // Call the original function
    const result = handleFileAdded(newFiles);
    
    // If files were added, show success toast
    if (newFiles.length > 0) {
      toast.success(`${newFiles.length} archivos añadidos correctamente`);
      setLastAction('files-added');
      setPlaybackErrors(null); // Reset errors when adding new files
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
    isUploading,
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
