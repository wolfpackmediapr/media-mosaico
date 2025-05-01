
import { useState } from "react";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";

interface UseRadioStateManagerProps {
  initialTranscriptionText?: string;
  initialTranscriptionId?: string;
  initialMetadata?: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
    station_id?: string;
    program_id?: string;
  };
}

export const useRadioStateManager = ({
  initialTranscriptionText = "",
  initialTranscriptionId = undefined,
  initialMetadata = {}
}: UseRadioStateManagerProps) => {
  // Transcription state
  const [transcriptionText, setTranscriptionText] = useState(initialTranscriptionText);
  const [transcriptionId, setTranscriptionId] = useState<string | undefined>(initialTranscriptionId);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | undefined>(undefined);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // News segments
  const [newsSegments, setNewsSegments] = useState<RadioNewsSegment[]>([]);
  
  // Metadata
  const [metadata, setMetadata] = useState(initialMetadata);

  // Handlers
  const handleTranscriptionTextChange = (text: string) => {
    setTranscriptionText(text);
  };

  const handleTranscriptionReceived = (result: TranscriptionResult) => {
    setTranscriptionResult(result);
    if (result.text) {
      setTranscriptionText(result.text);
    }
    setIsProcessing(false);
    setProgress(100);
  };

  const handleSegmentsReceived = (segments: RadioNewsSegment[]) => {
    setNewsSegments(segments);
  };

  const handleMetadataChange = (newMetadata: {
    emisora: string;
    programa: string;
    horario: string;
    categoria: string;
    station_id: string;
    program_id: string;
  }) => {
    setMetadata({
      ...metadata,
      ...newMetadata
    });
  };

  const handleTranscriptionProcessingError = (error: any) => {
    console.error("[RadioStateManager] Transcription processing error:", error);
    setIsProcessing(false);
    setProgress(0);
  };

  const resetTranscription = () => {
    setTranscriptionText("");
    setTranscriptionId(undefined);
    setTranscriptionResult(undefined);
    setNewsSegments([]);
    setMetadata({});
    setProgress(0);
    setIsProcessing(false);
  };

  return {
    // State
    transcriptionText,
    transcriptionId,
    transcriptionResult,
    isProcessing,
    progress,
    newsSegments,
    metadata,
    // Setters
    setTranscriptionText,
    setTranscriptionId,
    setIsProcessing,
    setProgress,
    setNewsSegments,
    // Handlers
    handleTranscriptionTextChange,
    handleTranscriptionReceived,
    handleSegmentsReceived,
    handleMetadataChange,
    handleTranscriptionProcessingError,
    resetTranscription
  };
};
