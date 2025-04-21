import { useState, useEffect, useRef, useMemo } from "react";
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

const RadioContainerLeftSection = ({
  files,
  setFiles,
  currentFileIndex,
  setCurrentFileIndex,
  isProcessing,
  setIsProcessing,
  progress,
  setProgress,
  transcriptionText,
  setTranscriptionText,
  setTranscriptionId,
  handleTranscriptionReceived,
  handleFilesAdded
}) => (
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

const RadioContainerRightSection = ({
  currentFile,
  metadata,
  files,
  currentFileIndex,
  isPlaying,
  currentTime,
  duration,
  isMuted,
  volume,
  playbackRate,
  onPlayPause,
  onSeek,
  onSkip,
  onToggleMute,
  onVolumeChange,
  onPlaybackRateChange,
  handleTrackSelect
}) => (
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
        onPlayPause={onPlayPause}
        onSeek={onSeek}
        onSkip={onSkip}
        onToggleMute={onToggleMute}
        onVolumeChange={onVolumeChange}
        onPlaybackRateChange={onPlaybackRateChange}
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

const RadioContainerTranscriptionSection = ({
  isProcessing,
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  metadata,
  handleTranscriptionTextChange,
  handleSegmentsReceived,
  handleMetadataChange,
  handleSeekToSegment,
  registerEditorReset
}) => (
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
    registerEditorReset={registerEditorReset}
  />
);

const RadioContainerAnalysisSection = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  handleSegmentsReceived,
  onClearAnalysis
}) => (
  <RadioAnalysis 
    transcriptionText={transcriptionText} 
    transcriptionId={transcriptionId}
    transcriptionResult={transcriptionResult}
    onSegmentsGenerated={handleSegmentsReceived}
    onClearAnalysis={onClearAnalysis}
  />
);

const RadioContainerNewsSegmentsSection = ({
  newsSegments,
  setNewsSegments,
  handleSeekToSegment,
  isProcessing
}) => newsSegments.length > 0 ? (
  <RadioNewsSegmentsContainer
    segments={newsSegments}
    onSegmentsChange={setNewsSegments}
    onSeek={handleSeekToSegment}
    isProcessing={isProcessing}
  />
) : null;

const RadioContainerTopSection = ({
  handleClearAll,
  files,
  transcriptionText
}) => (
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
  
  // Add a reference to editor reset
  const editorResetRef = useRef<null | (() => void)>(null);

  // Find and pass resetLocalSpeakerText from the editor to keep centralized clearing
  const handleEditorRegisterReset = (resetFn: () => void) => {
    editorResetRef.current = resetFn;
  };

  const handleClearAll = () => {
    console.log('[RadioContainer] handleClearAll: Removing all files and state');
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
    editorResetRef.current?.(); // <-- clear local speaker state
    if (onTextChange) onTextChange("");
    console.log('[RadioContainer] handleClearAll: All state, segments, and callbacks cleared');
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

  return (
    <>
      <RadioContainerTopSection
        handleClearAll={handleClearAll}
        files={files}
        transcriptionText={transcriptionText}
      />
      <RadioLayout
        isAuthenticated={isAuthenticated}
        leftSection={
          <RadioContainerLeftSection
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
            handleTranscriptionReceived={handleTranscriptionReceived}
            handleFilesAdded={handleFilesAdded}
          />
        }
        rightSection={
          <RadioContainerRightSection
            currentFile={currentFile}
            metadata={metadata}
            files={files}
            currentFileIndex={currentFileIndex}
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
            handleTrackSelect={handleTrackSelect}
          />
        }
        transcriptionSection={
          <RadioContainerTranscriptionSection
            isProcessing={isProcessing}
            transcriptionText={transcriptionText}
            transcriptionId={transcriptionId}
            transcriptionResult={transcriptionResult}
            metadata={metadata}
            handleTranscriptionTextChange={handleTranscriptionTextChange}
            handleSegmentsReceived={handleSegmentsReceived}
            handleMetadataChange={handleMetadataChange}
            handleSeekToSegment={handleSeekToSegment}
            registerEditorReset={handleEditorRegisterReset}
          />
        }
        analysisSection={
          <RadioContainerAnalysisSection
            transcriptionText={transcriptionText}
            transcriptionId={transcriptionId}
            transcriptionResult={transcriptionResult}
            handleSegmentsReceived={handleSegmentsReceived}
            onClearAnalysis={(fn) => { clearAnalysisRef.current = fn; }}
          />
        }
        newsSegmentsSection={
          <RadioContainerNewsSegmentsSection
            newsSegments={newsSegments}
            setNewsSegments={setNewsSegments}
            handleSeekToSegment={handleSeekToSegment}
            isProcessing={isProcessing}
          />
        }
      />
    </>
  );
};

export default RadioContainer;
