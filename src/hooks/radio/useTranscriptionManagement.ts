
import { useCallback } from "react";
import { useRadioTranscription } from "./useRadioTranscription";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";

export const useTranscriptionManagement = () => {
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

  // Enhanced error handling for transcription processing
  const handleTranscriptionProcessingError = useCallback((error: any) => {
    console.error("[useTranscriptionManagement] Processing error:", error);
    
    // Clear processing state
    setIsProcessing(false);
    setProgress(0);
    
    // Return the error for upper layers to handle
    return error;
  }, [setIsProcessing, setProgress]);

  // Enhanced transcription text change handler
  const handleTranscriptionTextChange = useCallback((text: string) => {
    handleTranscriptionChange(text);
  }, [handleTranscriptionChange]);

  return {
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
    resetTranscription,
    handleTranscriptionProcessingError
  };
};
