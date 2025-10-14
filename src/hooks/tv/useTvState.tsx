import { useTvVideoProcessor } from "./useTvVideoProcessor";
import { useTvClearState } from "./useTvClearState";
import { useTvNotepadState } from "./useTvNotepadState";
import { usePersistentVideoState } from "./usePersistentVideoState";

export const useTvState = () => {
  console.log('[useTvState] Hook initialized');
  const {
    isProcessing,
    progress,
    transcriptionText,
    transcriptionMetadata,
    transcriptionResult,
    transcriptionId,
    newsSegments,
    assemblyId,
    analysisResults,
    processVideo,
    setTranscriptionText,
    setNewsSegments
  } = useTvVideoProcessor();

  const {
    uploadedFiles,
    setUploadedFiles,
    isPlaying,
    volume,
    currentVideoPath,
    onTogglePlayback,
    onVolumeChange,
    currentTime,
    onPlayPause,
    onSeekToTimestamp,
    setCurrentVideoPath,
    registerVideoElement,
    isActiveMediaRoute,
    setIsMediaPlaying
  } = usePersistentVideoState();

  const { notepadContent, setNotepadContent } = useTvNotepadState();

  const {
    lastAction,
    clearAllTvState,
    clearingProgress,
    clearingStage,
    isClearing
  } = useTvClearState({
    setUploadedFiles,
    setTranscriptionText,
    setNewsSegments,
    setNotepadContent
  });

  const handleProcess = (file: File) => {
    processVideo(file);
    // Phase 1: Don't set mock video path - let the video player set the actual src
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
  };

  const handleSegmentsReceived = (segments: any[]) => {
    setNewsSegments(segments);
  };

  return {
    // File management
    uploadedFiles,
    setUploadedFiles,
    
    // Video controls
    isPlaying,
    volume,
    currentVideoPath,
    onTogglePlayback,
    onVolumeChange,
    currentTime,
    onPlayPause,
    registerVideoElement,
    isActiveMediaRoute,
    setIsMediaPlaying,
    
    // Processing state
    isProcessing,
    progress,
    
    // Content state
    transcriptionText,
    transcriptionMetadata,
    transcriptionResult,
    transcriptionId,
    newsSegments,
    assemblyId,
    notepadContent,
    analysisResults,
    
    // Actions
    onProcess: handleProcess,
    onTranscriptionComplete: setTranscriptionText,
    onRemoveFile: handleRemoveFile,
    onTranscriptionChange: setTranscriptionText,
    onSeekToTimestamp,
    onSegmentsReceived: handleSegmentsReceived,
    setNewsSegments,
    setNotepadContent,
    
    // Clear functionality
    lastAction,
    clearAllTvState,
    clearingProgress,
    clearingStage,
    isClearing
  };
};
