
import { useState } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

export function useRadioTranscription() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [transcriptionText, setTranscriptionText] = usePersistentState<string>(
    'radio-transcription-text', 
    '',
    { storage: 'sessionStorage' }
  );
  
  const [transcriptionId, setTranscriptionId] = usePersistentState<string>(
    'radio-transcription-id',
    '',
    { storage: 'sessionStorage' }
  );
  
  // Store the full transcription result object
  const [transcriptionResult, setTranscriptionResult] = usePersistentState<TranscriptionResult | undefined>(
    'radio-transcription-result',
    undefined,
    { storage: 'sessionStorage' }
  );
  
  // Store metadata
  const [metadata, setMetadata] = usePersistentState<{
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
    station_id?: string;
    program_id?: string;
  }>(
    'radio-metadata',
    {},
    { storage: 'sessionStorage' }
  );
  
  // Store news segments
  const [newsSegments, setNewsSegments] = usePersistentState<RadioNewsSegment[]>(
    'radio-news-segments',
    [],
    { storage: 'sessionStorage' }
  );

  const handleTranscriptionChange = (text: string) => {
    setTranscriptionText(text);
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
    setMetadata(newMetadata);
  };

  const handleTranscriptionReceived = (result: TranscriptionResult) => {
    setTranscriptionText(result.text);
    setTranscriptionResult(result);
  };

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
    handleTranscriptionChange,
    handleSegmentsReceived,
    handleMetadataChange,
    handleTranscriptionReceived
  };
}
