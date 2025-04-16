import { useState, useEffect } from "react";
import FileUploadSection from "./FileUploadSection";
import RadioTranscriptionSlot from "./RadioTranscriptionSlot";
import RadioNewsSegmentsContainer from "./RadioNewsSegmentsContainer";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { useAudioPlayer } from "@/hooks/radio/use-audio-player";
import MediaControls from "./MediaControls";
import RadioAnalysis from "./RadioAnalysis";
import RadioLayout from "./RadioLayout";
import { useRadioFiles } from "@/hooks/radio/useRadioFiles";
import { useRadioTranscription } from "@/hooks/radio/useRadioTranscription";

interface RadioContainerProps {
  persistedText?: string;
  onTextChange?: (text: string) => void;
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
}

const RadioContainer = ({ 
  persistedText = "", 
  onTextChange,
  persistKey = "radio-files",
  storage = "sessionStorage"
}: RadioContainerProps) => {
  const { isAuthenticated } = useAuthStatus();
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
    handleTranscriptionChange,
    handleSegmentsReceived,
    handleMetadataChange,
    handleTranscriptionReceived
  } = useRadioTranscription();

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

  const handleSeekToSegment = (timestamp: number) => {
    console.log(`Seeking to segment timestamp: ${timestamp}ms, audio current time: ${currentTime}s`);
    seekToTimestamp(timestamp);
  };

  const handleTranscriptionTextChange = (text: string) => {
    handleTranscriptionChange(text);
    if (onTextChange) {
      onTextChange(text);
    }
  };

  const leftSection = (
    <FileUploadSection 
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

  const rightSection = (
    <>
      {currentFile && (
        <MediaControls
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
      )}
    </>
  );

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

  const analysisSection = (
    <RadioAnalysis 
      transcriptionText={transcriptionText} 
      transcriptionId={transcriptionId}
      transcriptionResult={transcriptionResult}
      onSegmentsGenerated={handleSegmentsReceived}
    />
  );

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
