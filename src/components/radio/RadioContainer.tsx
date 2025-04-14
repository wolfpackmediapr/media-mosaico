
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
import { toast } from "sonner";

const RadioContainer = () => {
  const { isAuthenticated } = useAuthStatus();
  const {
    files,
    setFiles,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    handleRemoveFile,
    markFileAsNeedsReupload,
    clearFiles
  } = useRadioFiles();
  
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

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      clearFiles();
    };
  }, [clearFiles]);

  // Only initialize audio player if we have a valid current file
  // We explicitly check if currentFile is a valid File with size > 0
  const hasValidFile = currentFile instanceof File && currentFile.size > 0;
  const audioPlayerProps = hasValidFile ? { 
    file: currentFile,
    onError: (error: string) => {
      console.error("Audio player error:", error);
      // Mark the current file as needing reupload
      if (currentFileIndex >= 0) {
        markFileAsNeedsReupload(currentFileIndex);
      }
    }
  } : { file: undefined };
  
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
    seekToTimestamp,
    isValid: isAudioValid
  } = useAudioPlayer(audioPlayerProps);

  const handleSeekToSegment = (timestamp: number) => {
    console.log(`Seeking to segment timestamp: ${timestamp}ms, audio current time: ${currentTime}s`);
    if (!isAudioValid) {
      toast.error("No se puede reproducir el audio", {
        description: "El archivo de audio no es válido o necesita volver a subirse"
      });
      return;
    }
    seekToTimestamp(timestamp);
  };

  const handleFileError = () => {
    // This will be called when there's an error with the audio file
    // Clear the current file or prompt for reupload
    toast.info("Por favor, suba el archivo de nuevo para continuar", {
      action: {
        label: "Entendido",
        onClick: () => {}
      }
    });
  };

  // File upload section (now left column only)
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
      onRemoveFile={handleRemoveFile}
    />
  );

  // Media controls and audio file list (now right column)
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
          onFileError={handleFileError}
        />
      )}
    </>
  );

  // Transcription section - full width below the two columns
  const transcriptionSection = (
    <RadioTranscriptionSlot
      isProcessing={isProcessing}
      transcriptionText={transcriptionText}
      transcriptionId={transcriptionId}
      transcriptionResult={transcriptionResult}
      metadata={metadata}
      onTranscriptionChange={handleTranscriptionChange}
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
