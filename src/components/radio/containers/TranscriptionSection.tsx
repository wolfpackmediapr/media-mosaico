
import React from "react";
import RadioTranscriptionSlot from "../RadioTranscriptionSlot";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { RadioNewsSegment } from "../RadioNewsSegmentsContainer";

interface TranscriptionSectionProps {
  isProcessing: boolean;
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  metadata: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
    station_id?: string;
    program_id?: string;
  };
  handleTranscriptionTextChange: (text: string) => void;
  handleSegmentsReceived: (segments: RadioNewsSegment[]) => void;
  handleMetadataChange: (metadata: {
    emisora: string;
    programa: string;
    horario: string;
    categoria: string;
    station_id: string;
    program_id: string;
  }) => void;
  handleSeekToSegment: (timestamp: number) => void;
  registerEditorReset: (resetFn: () => void) => void;
}

const TranscriptionSection = ({
  isProcessing,
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  metadata,
  handleTranscriptionTextChange,
  handleSegmentsReceived,
  handleMetadataChange,
  handleSeekToSegment,
  registerEditorReset
}: TranscriptionSectionProps) => (
  <RadioTranscriptionSlot
    isProcessing={isProcessing}
    transcriptionText={transcriptionText}
    transcriptionId={transcriptionId}
    transcriptionResult={transcriptionResult}
    metadata={metadata}
    onTranscriptionChange={handleTranscriptionTextChange}
    onSegmentsReceived={handleSegmentsReceived}
    onMetadataChange={handleMetadataChange}
    onTimestampClick={handleSeekToSegment}
    registerEditorReset={registerEditorReset}
  />
);

export default TranscriptionSection;
