
import { useEffect } from "react";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { useAudioPlayer } from "@/hooks/radio/use-audio-player";
import RadioAnalysis from "./RadioAnalysis";
import RadioLayout from "./RadioLayout";
import { useRadioFiles } from "@/hooks/radio/useRadioFiles";
import { useRadioTranscription } from "@/hooks/radio/useRadioTranscription";
import RadioTranscriptionSlot from "./RadioTranscriptionSlot";
import RadioLeftSection from "./sections/RadioLeftSection";
import RadioRightSection from "./sections/RadioRightSection";
import { useRadioSeekControl } from "@/hooks/radio/useRadioSeekControl";
import RadioNewsSegmentsContainer from "./RadioNewsSegmentsContainer";

interface RadioContainerProps {
  persistedText?: string;
  onTextChange?: (text: string) => void;
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
  shouldClearOnRefresh?: boolean;
}

const RadioContainer = ({ 
  persistedText = "", 
  onTextChange,
  persistKey = "radio-files",
  storage = "sessionStorage",
  shouldClearOnRefresh = false
}: RadioContainerProps) => {
  const { isAuthenticated } = useAuthStatus();
  
  // Radio files hook
  const {
    files,
    setFiles,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    handleRemoveFile,
    handleFilesAdded,
    clearFiles
  } = useRadioFiles({
    persistKey,
    storage
  });
  
  // Radio transcription hook
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
    handleTranscriptionChange,
    handleSegmentsReceived,
    handleMetadataChange,
    handleTranscriptionReceived
  } = useRadioTranscription();

  useEffect(() => {
    if (shouldClearOnRefresh) {
      const isPageRefresh = performance.navigation?.type === 1 || 
                         document.visibilityState === 'visible';
      
      if (isPageRefresh) {
        console.log("Page was refreshed, clearing radio files");
        clearFiles();
      }
    }
  }, [shouldClearOnRefresh, clearFiles]);

  useEffect(() => {
    if (persistedText && persistedText !== transcriptionText) {
      setTranscriptionText(persistedText);
    }
  }, [persistedText, setTranscriptionText]);

  useEffect(() => {
    if (onTextChange && transcriptionText && transcriptionText !== persistedText) {
      onTextChange(transcriptionText);
    }
  }, [transcriptionText, onTextChange, persistedText]);

  // Audio player hook
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
    seekToTimestamp
  } = useAudioPlayer({
    file: currentFile
  });

  // Seek control hook
  const { handleSeekToSegment } = useRadioSeekControl({
    seekToTimestamp,
    currentTime
  });

  // Handle transcription text changes
  const handleTranscriptionTextChange = (text: string) => {
    handleTranscriptionChange(text);
    if (onTextChange) {
      onTextChange(text);
    }
  };

  // Prepare the left section component
  const leftSection = (
    <RadioLeftSection 
      files={files}
      setFiles={setFiles}
      currentFileIndex={currentFileIndex}
      setCurrentFileIndex={setCurrentFileIndex}
      isProcessing={isProcessing}
      setIsProcessing={setIsProcessing}
      progress={progress}
      setProgress={setProgress}
      transcriptionText={transcriptionText}
      setTranscriptionText={setTranscriptionText}
      setTranscriptionId={setTranscriptionId}
      onTranscriptionComplete={handleTranscriptionReceived}
      onFilesAdded={handleFilesAdded}
    />
  );

  // Prepare the right section component
  const rightSection = (
    <RadioRightSection
      currentFile={currentFile}
      metadata={metadata}
      isPlaying={isPlaying}
      currentTime={currentTime}
      duration={duration}
      isMuted={isMuted}
      volume={volume}
      playbackRate={playbackRate}
      onPlayPause={handlePlayPause}
      onSeek={handleSeek}
      onSkip={handleSkip}
      onToggleMute={handleToggleMute}
      onVolumeChange={handleVolumeChange}
      onPlaybackRateChange={handlePlaybackRateChange}
    />
  );

  // Prepare the transcription section component
  const transcriptionSection = (
    <RadioTranscriptionSlot
      isProcessing={isProcessing}
      transcriptionText={transcriptionText}
      transcriptionId={transcriptionId}
      transcriptionResult={transcriptionResult}
      metadata={metadata}
      onTranscriptionChange={handleTranscriptionTextChange}
      onSegmentsReceived={handleSegmentsReceived}
      onMetadataChange={handleMetadataChange}
      onTimestampClick={handleSeekToSegment}
    />
  );

  // Prepare the analysis section component
  const analysisSection = (
    <RadioAnalysis 
      transcriptionText={transcriptionText} 
      transcriptionId={transcriptionId}
      transcriptionResult={transcriptionResult}
      onSegmentsGenerated={handleSegmentsReceived}
    />
  );

  // News segments section
  const newsSegmentsSection = newsSegments.length > 0 ? (
    <RadioNewsSegmentsContainer
      segments={newsSegments}
      onSegmentsChange={setNewsSegments}
      onSeek={handleSeekToSegment}
      isProcessing={isProcessing}
    />
  ) : null;

  return (
    <RadioLayout
      isAuthenticated={isAuthenticated}
      leftSection={leftSection}
      rightSection={rightSection}
      transcriptionSection={transcriptionSection}
      analysisSection={analysisSection}
      newsSegmentsSection={newsSegmentsSection}
    />
  );
};

export default RadioContainer;
