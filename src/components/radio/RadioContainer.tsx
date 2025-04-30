
import React from "react";
import { useRadioContainerState } from "@/hooks/radio/useRadioContainerState";
import RadioLayout from "./RadioLayout";
import {
  TopSection,
  LeftSection,
  RightSection,
  TranscriptionSection,
  AnalysisSection,
  NewsSegmentsSection
} from "./containers";
import { UploadedFile } from "./types"; // Import UploadedFile

interface RadioContainerProps {
  persistedText?: string;
  onTextChange?: (text: string) => void;
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
  isActiveMediaRoute?: boolean;
  isMediaPlaying?: boolean;
  setIsMediaPlaying?: (isPlaying: boolean) => void;
}

const RadioContainer = ({
  persistedText = "",
  onTextChange,
  persistKey = "radio-files",
  storage = "sessionStorage",
  isActiveMediaRoute = true,
  isMediaPlaying = false,
  setIsMediaPlaying = () => {}
}: RadioContainerProps) => {
  const state = useRadioContainerState({
    persistedText,
    onTextChange,
    persistKey,
    storage,
    isActiveMediaRoute,
    isMediaPlaying,
    setIsMediaPlaying
  });

  return (
    <>
      <TopSection
        handleClearAll={state.handleClearAll}
        files={state.files}
        transcriptionText={state.transcriptionText}
      />
      <RadioLayout
        isAuthenticated={state.isAuthenticated}
        leftSection={
          <LeftSection
            files={state.files as UploadedFile[]} // Cast files if necessary, ensure consistency
            setFiles={state.setFiles}
            currentFileIndex={state.currentFileIndex}
            setCurrentFileIndex={state.setCurrentFileIndex}
            isProcessing={state.isProcessing}
            setIsProcessing={state.setIsProcessing}
            progress={state.progress}
            setProgress={state.setProgress}
            transcriptionText={state.transcriptionText}
            setTranscriptionText={state.setTranscriptionText}
            setTranscriptionId={state.setTranscriptionId}
            handleTranscriptionReceived={state.handleTranscriptionReceived}
            handleFilesAdded={state.handleFilesAdded}
          />
        }
        rightSection={
          <RightSection
            currentFile={state.currentFile}
            metadata={state.metadata}
            files={state.files as UploadedFile[]} // Cast files if necessary
            currentFileIndex={state.currentFileIndex}
            isPlaying={state.isPlaying}
            currentTime={state.currentTime}
            duration={state.duration}
            isMuted={state.isMuted}
            volume={state.volume} // Pass volume directly without casting - RightSection now accepts number | number[]
            playbackRate={state.playbackRate}
            playbackErrors={state.playbackErrors}
            onPlayPause={state.handlePlayPause}
            onSeek={state.handleSeek}
            onSkip={state.handleSkip}
            onToggleMute={state.handleToggleMute}
            onVolumeChange={state.handleVolumeChange} // Pass the handler
            onPlaybackRateChange={state.handlePlaybackRateChange}
            handleTrackSelect={state.handleTrackSelect}
          />
        }
        transcriptionSection={
          <TranscriptionSection
            isProcessing={state.isProcessing}
            transcriptionText={state.transcriptionText}
            transcriptionId={state.transcriptionId}
            transcriptionResult={state.transcriptionResult}
            metadata={state.metadata}
            handleTranscriptionTextChange={state.handleTranscriptionTextChange}
            handleSegmentsReceived={state.handleSegmentsReceived}
            handleMetadataChange={state.handleMetadataChange}
            handleSeekToSegment={state.handleSeekToSegment}
            registerEditorReset={state.handleEditorRegisterReset}
            isPlaying={state.isPlaying}
            currentTime={state.currentTime}
            onPlayPause={state.handlePlayPause}
          />
        }
        analysisSection={
          <AnalysisSection
            transcriptionText={state.transcriptionText}
            transcriptionId={state.transcriptionId}
            transcriptionResult={state.transcriptionResult}
            handleSegmentsReceived={state.handleSegmentsReceived}
            onClearAnalysis={state.setClearAnalysis}
          />
        }
        newsSegmentsSection={
          <NewsSegmentsSection
            newsSegments={state.newsSegments}
            setNewsSegments={state.setNewsSegments}
            handleSeekToSegment={state.handleSeekToSegment}
            isProcessing={state.isProcessing}
          />
        }
      />
    </>
  );
};

export default RadioContainer;
