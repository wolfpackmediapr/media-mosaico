
import React, { useEffect } from "react";
import { useRadioContainerState } from "@/hooks/radio/useRadioContainerState";
import RadioLayout from "./RadioLayout";
import { TopSection } from "./containers/TopSection";
import { LeftSection } from "./containers/LeftSection";
import { RightSection } from "./containers/RightSection";
import { TranscriptionSection } from "./containers/TranscriptionSection";
import { AnalysisSection } from "./containers/AnalysisSection";
import { NewsSegmentsSection } from "./containers/NewsSegmentsSection";
import NotePadSection from "./containers/NotePadSection.tsx";
import { useRadioClearState } from "@/hooks/radio/useRadioClearState";
import { useNotepadState } from "@/hooks/radio/useNotepadState";

interface RadioContainerProps {
  persistedText?: string;
  onTextChange?: (text: string) => void;
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
  isActiveMediaRoute?: boolean;
  isMediaPlaying?: boolean;
  setIsMediaPlaying?: (isPlaying: boolean) => void;
  isAuthenticated?: boolean | null;
}

const RadioContainer = ({
  persistedText = "",
  onTextChange,
  persistKey = "radio-files",
  storage = "sessionStorage",
  isActiveMediaRoute = true,
  isMediaPlaying = false,
  setIsMediaPlaying = () => {},
  isAuthenticated = null
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

  // Use our enhanced clear state hook with resetTranscription
  const {
    handleClearAll,
    handleEditorRegisterReset,
    setClearAnalysis,
    clearingProgress,
    clearingStage
  } = useRadioClearState({
    transcriptionId: state.transcriptionId,
    persistKey,
    onTextChange,
    files: state.files,
    setFiles: state.setFiles,
    setNewsSegments: state.setNewsSegments,
    setTranscriptionText: state.setTranscriptionText,
    resetTranscription: state.resetTranscription, // Add reset function
  });

  // Add notepad state
  const {
    content: notepadContent,
    setContent: setNotepadContent,
    isExpanded: isNotepadExpanded,
    setIsExpanded: setIsNotepadExpanded,
    resetContent: resetNotepadContent
  } = useNotepadState({
    persistKey: `${persistKey}-notepad`,
    storage
  });

  // Create wrapper functions to handle type mismatches between components
  const handleVolumeChangeWrapper = (value: number[]) => {
    // Pass the array directly to the volume handler
    state.handleVolumeChange(value);
  };

  const handlePlaybackRateChangeWrapper = () => {
    // Get next playback rate in the sequence: 0.5 -> 1 -> 1.5 -> 2 -> 0.5
    const rates = [0.5, 1, 1.5, 2];
    const currentIndex = rates.indexOf(state.playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    state.handlePlaybackRateChange(rates[nextIndex]);
  };

  // Force UI refresh when state is cleared
  useEffect(() => {
    if (state.lastAction === 'clear') {
      console.log('[RadioContainer] Detected clear action, ensuring UI is refreshed');
      
      // Ensure transcription text is cleared
      state.setTranscriptionText('');
      
      // Ensure news segments are cleared
      state.setNewsSegments([]);
      
      // Clear notepad content
      resetNotepadContent();
      
      // Call any additional clear functions
      if (state.resetTranscription) {
        state.resetTranscription();
      }
    }
  }, [state.lastAction, resetNotepadContent]);

  // Ensure volume is always in array format for components that expect it
  const volumeArray = Array.isArray(state.volume) ? state.volume : [state.volume * 100];

  return (
    <>
      <TopSection
        handleClearAll={handleClearAll}
        files={state.files}
        transcriptionText={state.transcriptionText}
        clearingProgress={clearingProgress}
        clearingStage={clearingStage}
      />
      <RadioLayout
        isAuthenticated={isAuthenticated}
        leftSection={
          <LeftSection
            files={state.files}
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
            files={state.files}
            currentFileIndex={state.currentFileIndex}
            isPlaying={state.isPlaying}
            currentTime={state.currentTime}
            duration={state.duration}
            isMuted={state.isMuted}
            volume={volumeArray}
            playbackRate={state.playbackRate}
            playbackErrors={state.playbackErrors}
            onPlayPause={state.handlePlayPause}
            onSeek={state.handleSeek}
            onSkip={state.handleSkip}
            onToggleMute={state.handleToggleMute}
            onVolumeChange={handleVolumeChangeWrapper}
            onPlaybackRateChange={handlePlaybackRateChangeWrapper}
            handleTrackSelect={state.handleTrackSelect}
            onSwitchToNative={state.switchToNativeAudio}
            onValidateFileUrl={state.validateCurrentFileUrl}
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
            registerEditorReset={handleEditorRegisterReset}
            isPlaying={state.isPlaying}
            currentTime={state.currentTime}
            onPlayPause={state.handlePlayPause}
          />
        }
        notepadSection={
          <NotePadSection
            notepadContent={notepadContent}
            onNotepadContentChange={setNotepadContent}
            isExpanded={isNotepadExpanded}
            onExpandToggle={setIsNotepadExpanded}
          />
        }
        analysisSection={
          <AnalysisSection
            transcriptionText={state.transcriptionText}
            transcriptionId={state.transcriptionId}
            transcriptionResult={state.transcriptionResult}
            handleSegmentsReceived={state.handleSegmentsReceived}
            onClearAnalysis={setClearAnalysis}
            lastAction={state.lastAction} // Pass lastAction to help components detect clears
          />
        }
        newsSegmentsSection={
          <NewsSegmentsSection
            newsSegments={state.newsSegments}
            setNewsSegments={state.setNewsSegments}
            handleSeekToSegment={state.handleSeekToSegment}
            isProcessing={state.isProcessing}
            lastAction={state.lastAction} // Pass lastAction to help components detect clears
          />
        }
      />
    </>
  );
};

export default RadioContainer;
