
import { useTvVideoProcessor } from "./useTvVideoProcessor";
import { useTvClearState } from "./useTvClearState";
import { useTvNotepadState } from "./useTvNotepadState";
import { usePersistentVideoState } from "./usePersistentVideoState";

export const useTvState = () => {
  const {
    isProcessing,
    progress,
    transcriptionText,
    transcriptionMetadata,
    transcriptionResult,
    transcriptionId,
    newsSegments,
    assemblyId,
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
    onSeekToTimestamp
  } = usePersistentVideoState();

  const { notepadContent, setNotepadContent } = useTvNotepadState();

  const {
    lastAction,
    clearAllTvState
  } = useTvClearState({
    setUploadedFiles,
    setTranscriptionText,
    setNewsSegments,
    setNotepadContent
  });

  const handleProcess = (file: File) => {
    processVideo(file);
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
    currentVideoPath, // Now available for analysis
    onTogglePlayback,
    onVolumeChange,
    currentTime,
    onPlayPause,
    
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
    clearAllTvState
  };
};
