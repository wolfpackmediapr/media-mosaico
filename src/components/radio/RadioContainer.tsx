import { useState, useEffect, useRef } from "react";
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
import TrackList from "./TrackList";
import ClearAllButton from "./ClearAllButton";

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
    setTranscriptionResult,
    metadata,
    newsSegments,
    setNewsSegments,
    handleTranscriptionChange,
    handleSegmentsReceived,
    handleMetadataChange,
    handleTranscriptionReceived,
    resetTranscription
  } = useRadioTranscription();

  const clearAnalysisRef = useRef<(() => void) | null>(null);

  const handleClearAll = () => {
    sessionStorage.removeItem(`${persistKey}-metadata`);
    sessionStorage.removeItem(`${persistKey}-current-index`);
    sessionStorage.removeItem("radio-transcription");
    sessionStorage.removeItem("radio-transcription-draft");
    sessionStorage.removeItem("radio-content-analysis-draft");
    sessionStorage.removeItem("radio-content-analysis");
    sessionStorage.removeItem("radio-transcription-draft");
    sessionStorage.removeItem("transcription-timestamp-view-draft");
    sessionStorage.removeItem("transcription-editor-mode-draft");
    if (transcriptionId) {
      sessionStorage.removeItem(`radio-transcription-${transcriptionId}`);
      sessionStorage.removeItem(`transcription-timestamp-view-${transcriptionId}`);
      sessionStorage.removeItem(`transcription-editor-mode-${transcriptionId}`);
      sessionStorage.removeItem(`radio-content-analysis-${transcriptionId}`);
    }
    setFiles([]);
    setCurrentFileIndex(0);
    resetTranscription();
    setNewsSegments([]);
    clearAnalysisRef.current?.();
    if (onTextChange) onTextChange("");
  };

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

  const handleTrackSelect = (index: number) => {
    if (index !== currentFileIndex) {
      setCurrentFileIndex(index);
    }
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
    <div className="space-y-4">
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
      
      {files.length > 0 && (
        <TrackList
          files={files}
          currentFileIndex={currentFileIndex}
          onSelectTrack={handleTrackSelect}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
        />
      )}
    </div>
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
      onClearAnalysis={(fn) => { clearAnalysisRef.current = fn; }}
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

  const topSection = (
    <div className="flex justify-end mb-2">
      <ClearAllButton
        onClearAll={handleClearAll}
        disabled={
          files.length === 0 &&
          !transcriptionText
        }
      />
    </div>
  );

  return (
    <>
      {topSection}
      <RadioLayout
        isAuthenticated={isAuthenticated}
        leftSection={leftSection}
        rightSection={rightSection}
        transcriptionSection={transcriptionSection}
        analysisSection={analysisSection}
        newsSegmentsSection={newsSegmentsSection}
      />
    </>
  );
};

export default RadioContainer;
