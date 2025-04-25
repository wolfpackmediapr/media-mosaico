
import { useAuthStatus } from "@/hooks/use-auth-status";
import { useRadioFiles } from "@/hooks/radio/useRadioFiles";
import { useClearRadioState } from "@/hooks/radio/useClearRadioState";
import { useTranscriptionManagement } from "@/hooks/radio/useTranscriptionManagement";
import { useRadioControlsState } from "@/hooks/radio/useRadioControlsState";
import RadioLayout from "./RadioLayout";
import { TopSection, TranscriptionSection, AnalysisSection, NewsSegmentsSection } from "./containers";
import FileManagementSection from "./containers/FileManagementSection";

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
    handleTranscriptionTextChange,
    handleSegmentsReceived,
    handleMetadataChange,
    handleTranscriptionReceived,
    resetTranscription
  } = useTranscriptionManagement();

  const { 
    clearAllState, 
    handleEditorRegisterReset, 
    setClearAnalysis 
  } = useClearRadioState({
    transcriptionId,
    persistKey,
    onTextChange
  });

  const audioControls = useRadioControlsState({
    currentFile,
    isActiveMediaRoute,
    isMediaPlaying,
    setIsMediaPlaying
  });

  const handleClearAll = () => {
    resetTranscription();
    setNewsSegments([]);
    setFiles([]);
    setCurrentFileIndex(0);
    clearAllState();
  };

  // Create file management section (left and right sections combined)
  const fileManagementSection = (
    <FileManagementSection
      files={files}
      setFiles={setFiles}
      currentFileIndex={currentFileIndex}
      setCurrentFileIndex={setCurrentFileIndex}
      currentFile={currentFile}
      isProcessing={isProcessing}
      setIsProcessing={setIsProcessing}
      progress={progress}
      setProgress={setProgress}
      transcriptionText={transcriptionText}
      setTranscriptionText={setTranscriptionText}
      setTranscriptionId={setTranscriptionId}
      handleTranscriptionReceived={handleTranscriptionReceived}
      handleFilesAdded={handleFilesAdded}
      metadata={metadata}
      audioControls={audioControls}
    />
  );

  return (
    <>
      <TopSection
        handleClearAll={handleClearAll}
        files={files}
        transcriptionText={transcriptionText}
      />
      <RadioLayout
        isAuthenticated={isAuthenticated}
        leftSection={fileManagementSection}
        rightSection={null} // Adding this to satisfy the prop requirement
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
            handleSeekToSegment={audioControls.handleSeekToSegment}
            registerEditorReset={handleEditorRegisterReset}
            isPlaying={audioControls.isPlaying}
            currentTime={audioControls.currentTime}
            onPlayPause={audioControls.handlePlayPause}
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
            handleSeekToSegment={audioControls.handleSeekToSegment}
            isProcessing={isProcessing}
          />
        }
      />
    </>
  );
};

export default RadioContainer;
