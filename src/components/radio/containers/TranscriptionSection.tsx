
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
  // Add audio player state and control props
  isPlaying?: boolean;
  currentTime?: number;
  onPlayPause?: () => void;
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
  registerEditorReset,
  // Audio player props
  isPlaying = false,
  currentTime = 0,
  onPlayPause = () => {},
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
    // Pass audio player props
    isPlaying={isPlaying}
    currentTime={currentTime}
    onPlayPause={onPlayPause}
    onSeek={handleSeekToSegment}
  />
);

export default TranscriptionSection;
