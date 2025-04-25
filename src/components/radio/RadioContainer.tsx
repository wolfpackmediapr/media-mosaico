
import { useEffect } from "react";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { useAudioPlayer } from "@/hooks/radio/use-audio-player";
import RadioLayout from "./RadioLayout";
import { useRadioFiles } from "@/hooks/radio/useRadioFiles";
import { useRadioTranscription } from "@/hooks/radio/useRadioTranscription";
import { useClearRadioState } from "@/hooks/radio/useClearRadioState";

import {
  TopSection,
  LeftSection,
  RightSection,
  TranscriptionSection,
  AnalysisSection,
  NewsSegmentsSection
} from "./containers";

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
    handleTranscriptionReceived,
    resetTranscription
  } = useRadioTranscription();

  const { 
    clearAllState, 
    handleEditorRegisterReset, 
    setClearAnalysis 
  } = useClearRadioState({
    transcriptionId,
    persistKey,
    onTextChange
  });

  const handleClearAll = () => {
    console.log('[RadioContainer] handleClearAll: Starting clear sequence');
    resetTranscription();
    setNewsSegments([]);
    setFiles([]);
    setCurrentFileIndex(0);
    clearAllState();
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
      <TopSection
        handleClearAll={handleClearAll}
        files={files}
        transcriptionText={transcriptionText}
      />
      <RadioLayout
        isAuthenticated={isAuthenticated}
        leftSection={
          <LeftSection
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
          <RightSection
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
          <TranscriptionSection
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
            isPlaying={isPlaying}
            currentTime={currentTime}
            onPlayPause={handlePlayPause}
          />
        }
        analysisSection={
          <AnalysisSection
            transcriptionText={transcriptionText}
            transcriptionId={transcriptionId}
            transcriptionResult={transcriptionResult}
            handleSegmentsReceived={handleSegmentsReceived}
            onClearAnalysis={setClearAnalysis}
          />
        }
        newsSegmentsSection={
          <NewsSegmentsSection
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
