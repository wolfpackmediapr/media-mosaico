import { useRef, useEffect } from "react";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { useAudioPlayer } from "@/hooks/radio/use-audio-player";
import RadioLayout from "./RadioLayout";
import { useRadioFiles } from "@/hooks/radio/useRadioFiles";
import { useRadioTranscription } from "@/hooks/radio/useRadioTranscription";

// Import the refactored component sections using barrel exports
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
  const editorResetRef = useRef<null | (() => void)>(null);

  const handleEditorRegisterReset = (resetFn: () => void) => {
    editorResetRef.current = resetFn;
  };

  const handleClearAll = () => {
    console.log('[RadioContainer] handleClearAll: Removing all files and state');
    
    const keysToDelete = [
      `${persistKey}-metadata`,
      `${persistKey}-current-index`,
      "radio-transcription",
      "radio-transcription-draft",
      "radio-content-analysis-draft",
      "radio-content-analysis",
      "radio-transcription-speaker-draft",
      "transcription-timestamp-view-draft",
      "transcription-editor-mode-draft",
    ];

    if (transcriptionId) {
      keysToDelete.push(
        `radio-transcription-${transcriptionId}`,
        `radio-transcription-speaker-${transcriptionId}`,
        `transcription-timestamp-view-${transcriptionId}`,
        `transcription-editor-mode-${transcriptionId}`,
        `radio-content-analysis-${transcriptionId}`
      );
    }

    keysToDelete.forEach(key => {
      sessionStorage.removeItem(key);
    });

    const allKeys = Object.keys(sessionStorage);
    const patternPrefixes = [
      'radio-transcription',
      'transcription-editor',
      'transcription-timestamp',
      'radio-content-analysis'
    ];

    allKeys.forEach(key => {
      if (patternPrefixes.some(prefix => key.startsWith(prefix))) {
        console.log(`[RadioContainer] Clearing additional key: ${key}`);
        sessionStorage.removeItem(key);
      }
    });

    setFiles([]);
    setCurrentFileIndex(0);
    resetTranscription();
    setNewsSegments([]);

    clearAnalysisRef.current?.();

    if (editorResetRef.current) {
      console.log('[RadioContainer] Calling editor reset function');
      editorResetRef.current();
    } else {
      console.log('[RadioContainer] No editor reset function registered');
    }

    if (onTextChange) onTextChange("");
    console.log('[RadioContainer] handleClearAll: All state, segments, and callbacks cleared');
  };

  // Effect to handle persisted text from parent
  useEffect(() => {
    if (persistedText && persistedText !== transcriptionText) {
      setTranscriptionText(persistedText);
    }
  }, [persistedText, setTranscriptionText]);

  // Effect to update parent with transcription changes
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
          />
        }
        analysisSection={
          <AnalysisSection
            transcriptionText={transcriptionText}
            transcriptionId={transcriptionId}
            transcriptionResult={transcriptionResult}
            handleSegmentsReceived={handleSegmentsReceived}
            onClearAnalysis={(fn) => { clearAnalysisRef.current = fn; }}
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
