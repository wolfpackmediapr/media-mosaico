
import { useState, useEffect } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useTvTabState } from "@/hooks/tv/useTvTabState";
import { useTvVideoProcessor } from "@/hooks/tv/useTvVideoProcessor";
import { usePersistentVideoState } from "@/hooks/tv/usePersistentVideoState";
import { useTvClearState } from "@/hooks/tv/useTvClearState";
import { useTvNotepadState } from "@/hooks/tv/useTvNotepadState";

interface UploadedFile extends File {
  preview?: string;
}

export const useTvState = () => {
  // Use persistent state for uploaded files
  const [uploadedFiles, setUploadedFiles] = usePersistentState<UploadedFile[]>(
    "tv-uploaded-files",
    [],
    { storage: 'sessionStorage' }
  );
  
  // Video playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Persistent video state across routes
  const { isActiveMediaRoute, isMediaPlaying, setIsMediaPlaying } = usePersistentVideoState();
  
  // Volume preferences
  const [volume, setVolume] = usePersistentState<number[]>(
    "tv-player-volume",
    [50],
    { storage: 'localStorage' }
  );
  
  // Tab state for transcription text
  const { textContent, setTextContent } = useTvTabState({
    persistKey: "tv-transcription",
    storage: 'sessionStorage',
    persistTextContent: true
  });

  // Sync local playing state with global state
  useEffect(() => {
    if (isActiveMediaRoute) {
      setIsPlaying(isMediaPlaying);
    }
  }, [isActiveMediaRoute, isMediaPlaying]);

  // Use the refactored video processor
  const {
    isProcessing,
    progress,
    transcriptionText,
    transcriptionMetadata,
    transcriptionResult,
    transcriptionId,
    newsSegments,
    processVideo,
    setTranscriptionText: setVideoProcessorText,
    setNewsSegments
  } = useTvVideoProcessor();

  // Clear state management
  const {
    handleClearAll,
    handleEditorRegisterReset,
    setClearAnalysis,
    clearingProgress,
    clearingStage,
    lastAction
  } = useTvClearState({
    persistKey: "tv-files",
    onTextChange: setTextContent,
    files: uploadedFiles,
    setFiles: setUploadedFiles,
    setNewsSegments,
    setTranscriptionText: setVideoProcessorText,
  });

  // Notepad state
  const {
    content: notepadContent,
    setContent: setNotepadContent,
    isExpanded: isNotepadExpanded,
    setIsExpanded: setIsNotepadExpanded,
  } = useTvNotepadState({
    persistKey: "tv-notepad",
    storage: 'sessionStorage'
  });

  // Sync video processor text with persisted text state
  useEffect(() => {
    if (transcriptionText && transcriptionText !== textContent) {
      setTextContent(transcriptionText);
    }
  }, [transcriptionText, setTextContent, textContent]);

  // Update processor state when text content changes externally
  useEffect(() => {
    if (textContent && textContent !== transcriptionText) {
      setVideoProcessorText(textContent);
    }
  }, [textContent, transcriptionText, setVideoProcessorText]);

  // Enhanced text change handler
  const handleTranscriptionChange = (text: string) => {
    setTextContent(text);
    setVideoProcessorText(text);
  };

  const togglePlayback = () => {
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    setIsMediaPlaying(newPlayingState);
  };

  const handleTranscriptionComplete = (text: string) => {
    handleTranscriptionChange(text);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSeekToTimestamp = (timestamp: number) => {
    const timeInSeconds = timestamp / 1000;
    
    const videoElements = document.querySelectorAll('video');
    if (videoElements.length > 0) {
      const videoElement = videoElements[0];
      videoElement.currentTime = timeInSeconds;
      videoElement.play();
      setIsPlaying(true);
      setIsMediaPlaying(true);
    } else {
      console.warn('No video element found to seek');
    }
  };

  return {
    // State
    uploadedFiles,
    setUploadedFiles,
    isPlaying,
    currentTime,
    volume,
    setVolume,
    textContent,
    notepadContent,
    setNotepadContent,
    isNotepadExpanded,
    setIsNotepadExpanded,
    
    // Video processor state
    isProcessing,
    progress,
    transcriptionText,
    transcriptionMetadata,
    transcriptionResult,
    transcriptionId,
    newsSegments,
    setNewsSegments,
    
    // Clear state
    clearingProgress,
    clearingStage,
    lastAction,
    
    // Media state
    isActiveMediaRoute,
    
    // Handlers
    handleClearAll,
    handleEditorRegisterReset,
    setClearAnalysis,
    togglePlayback,
    handleTranscriptionChange,
    handleTranscriptionComplete,
    handleRemoveFile,
    handleSeekToTimestamp,
    processVideo
  };
};
