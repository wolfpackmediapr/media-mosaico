
import { useState, useEffect, useCallback } from "react";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";

export const useRadioTranscription = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [transcriptionId, setTranscriptionId] = useState<string>();
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult>();
  const [newsSegments, setNewsSegments] = useState<RadioNewsSegment[]>([]);
  const [metadata, setMetadata] = useState<{
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
    station_id?: string;
    program_id?: string;
  }>({});

  const handleTranscriptionChange = (newText: string) => {
    setTranscriptionText(newText);
  };

  const handleSegmentsReceived = (segments: RadioNewsSegment[]) => {
    console.log("Received segments:", segments.length);
    if (segments && segments.length > 0) {
      setNewsSegments(segments);
    }
  };

  const handleMetadataChange = (newMetadata: {
    emisora: string;
    programa: string;
    horario: string;
    categoria: string;
    station_id: string;
    program_id: string;
  }) => {
    setMetadata(newMetadata);
  };

  const handleTranscriptionReceived = (result: TranscriptionResult) => {
    console.log('[useRadioTranscription] Received transcription result:', result);
    
    // Force processing state to be false immediately
    setIsProcessing(false);
    
    // Set all data in a single update cycle if possible
    setTranscriptionText(result.text || "");
    setTranscriptionResult(result);
    setTranscriptionId(result.transcript_id);
    
    // Log that processing state has been cleared
    console.log('[useRadioTranscription] Processing state cleared');
  };

  // Add an effect to ensure processing state is cleared after a timeout
  // This is a safety measure in case something goes wrong
  useEffect(() => {
    if (isProcessing) {
      const timeout = setTimeout(() => {
        console.log('[useRadioTranscription] Clearing processing state due to timeout');
        setIsProcessing(false);
      }, 60000); // 1 minute timeout
      
      return () => clearTimeout(timeout);
    }
  }, [isProcessing]);

  // Enhanced reset function to properly clear all state
  const resetTranscription = useCallback(() => {
    console.log('[useRadioTranscription] Resetting all transcription state');
    
    try {
      // Reset all state values
      setTranscriptionText("");
      setTranscriptionId(undefined);
      
      // Explicitly clear the transcription result including utterances
      setTranscriptionResult(undefined);
      
      setNewsSegments([]);
      setMetadata({});
      
      console.log('[useRadioTranscription] Transcription reset complete');
    } catch (error) {
      console.error('[useRadioTranscription] Error during transcription reset:', error);
      
      // Ensure we still reset critical states even if there's an error
      setTranscriptionText("");
      setTranscriptionResult(undefined);
    }
  }, []);

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
    setTranscriptionResult,
    metadata,
    newsSegments,
    setNewsSegments,
    handleTranscriptionChange,
    handleSegmentsReceived,
    handleMetadataChange,
    handleTranscriptionReceived,
    resetTranscription
  };
};
