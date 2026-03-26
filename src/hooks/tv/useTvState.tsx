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
    setNewsSegments,
    setTranscriptionId,
    setTranscriptionMetadata,
    setTranscriptionResult,
    setAnalysisResults,
    setAssemblyId,
    removeTranscriptionText,
    removeTranscriptionMetadata,
    removeTranscriptionResult,
    removeTranscriptionId,
    removeNewsSegments,
    removeAnalysisResults,
    removeActiveProcessingId
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
    setIsMediaPlaying,
    isRestoring // NEW: State restoration indicator
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
    setNotepadContent,
    setTranscriptionId,
    setTranscriptionMetadata,
    setTranscriptionResult,
    setAnalysisResults,
    setAssemblyId,
    removeTranscriptionText,
    removeTranscriptionMetadata,
    removeTranscriptionResult,
    removeTranscriptionId,
    removeNewsSegments,
    removeAnalysisResults,
    removeActiveProcessingId
  });

  const handleProcess = (file: File) => {
    // Pass callback to update uploadedFiles with the permanent Supabase URL
    // This prevents the video from going gray when the blob URL becomes invalid
    processVideo(file, (publicUrl: string) => {
      console.log('[useTvState] Updating uploadedFiles with permanent URL:', publicUrl.substring(0, 60));
      setUploadedFiles(
        uploadedFiles.map(f => {
          if (f.name === file.name && f.size === file.size) {
            // Create a new object with the filePath set
            return Object.assign(Object.create(Object.getPrototypeOf(f)), f, {
              filePath: publicUrl
            });
          }
          return f;
        })
      );
    });
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
    
    // State restoration
    isRestoring, // NEW: Indicates if state is being restored from storage
    
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
