
import { useState } from "react";
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
    setTranscriptionText(result.text || "");
    setTranscriptionResult(result);
    setTranscriptionId(result.transcript_id);
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
    setTranscriptionResult,
    metadata,
    newsSegments,
    setNewsSegments,
    handleTranscriptionChange,
    handleSegmentsReceived,
    handleMetadataChange,
    handleTranscriptionReceived
  };
};
